import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { RouteRepository } from '@/route/repositories/route.repository';

export interface KtoRelatedItem {
  tatsNm?: string;
  rlteTatsNm?: string;
  rlteRank?: number | string;
  [key: string]: unknown;
}

export interface KtoRelatedApiResponse {
  response?: {
    body?: {
      totalCount?: number;
      items?: {
        item?: KtoRelatedItem | KtoRelatedItem[];
      };
    };
  };
}

export interface KtoRelatedSyncResult {
  collectedCount: number;
  matchedPlaceCount: number;
  failureCount: number;
  apiCallCount: number;
}

export interface KtoRelatedSyncStatus {
  dailyApiUsage: number;
  dailyQuotaLimit: number;
  lastCollectedAt: Date | null;
  lastAttemptAt: Date | null;
  status: 'IDLE' | 'RUNNING';
  lastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null;
  lastMessage: string | null;
  matchedPlaceCount: number;
}

@Injectable()
export class KtoRelatedPlaceSyncService {
  private readonly logger = new Logger(KtoRelatedPlaceSyncService.name);

  private isRunning = false;
  private lastCollectedAt: Date | null = null;
  private lastAttemptAt: Date | null = null;
  private lastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null = null;
  private lastMessage: string | null = null;
  private dailyApiUsage = 0;
  private lastApiUsageDate: string | null = null;
  private matchedPlaceCount = 0;

  constructor(private readonly routeRepository: RouteRepository) {}

  safeDecodeApiKey(rawKey: string): string {
    if (!rawKey) return '';
    try {
      const decoded = decodeURIComponent(rawKey);
      if (decoded !== rawKey && decoded.includes('%')) {
        return decodeURIComponent(decoded);
      }
      return decoded;
    } catch {
      return rawKey;
    }
  }

  private checkAndResetDailyUsage(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastApiUsageDate !== today) {
      this.dailyApiUsage = 0;
      this.lastApiUsageDate = today;
    }
  }

  getLastAttemptAt(): Date | null {
    return this.lastAttemptAt;
  }

  getStatus(): KtoRelatedSyncStatus {
    this.checkAndResetDailyUsage();
    return {
      dailyApiUsage: this.dailyApiUsage,
      dailyQuotaLimit: 1000,
      lastCollectedAt: this.lastCollectedAt,
      lastAttemptAt: this.lastAttemptAt,
      status: this.isRunning ? 'RUNNING' : 'IDLE',
      lastResult: this.lastResult,
      lastMessage: this.lastMessage,
      matchedPlaceCount: this.matchedPlaceCount,
    };
  }

  /**
   * 한국관광공사 연관관광지 정보(TarRlteTarService1) 일일 정기 동기화
   * 공사 데이터 갱신(07:30) 이후 매일 08:00에 실행
   */
  @Cron('0 8 * * *', { timeZone: 'Asia/Seoul' })
  async handleCronRelatedPlaceSync(): Promise<void> {
    try {
      await this.handleRelatedPlaceSync();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`연관관광지 정기 크론 실행 중 오류 발생: ${errMsg}`);
    }
  }

  async handleRelatedPlaceSync(): Promise<KtoRelatedSyncResult> {
    this.checkAndResetDailyUsage();

    if (this.isRunning) {
      this.logger.warn('연관관광지 동기화 작업이 이미 실행 중입니다.');
      throw new HttpException(
        '연관관광지 동기화 작업이 이미 실행 중입니다.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.isRunning = true;
    this.lastAttemptAt = new Date();
    this.logger.log(
      '한국관광공사(TarRlteTarService1) 연관관광지 정기 동기화를 시작합니다.',
    );

    const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
    const serviceKey = rawApiKey ? this.safeDecodeApiKey(rawApiKey) : '';

    let collectedCount = 0;
    let matchedPlaceCount = 0;
    let failureCount = 0;
    let apiCallCount = 0;

    if (!serviceKey) {
      this.logger.warn(
        'VK_KORSERVICE2_API_KEY가 설정되지 않아 연관관광지 동기화를 건너뜁니다.',
      );
      this.isRunning = false;
      this.lastResult = 'FAILURE';
      this.lastMessage = 'API 키가 설정되지 않았습니다.';
      return {
        collectedCount,
        matchedPlaceCount,
        failureCount: 1,
        apiCallCount,
      };
    }

    const endpoint =
      'https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1';
    const ROWS_PER_PAGE = 50;
    const MAX_PAGES = 10;
    let lastErrorMsg: string | null = null;

    try {
      let pageNo = 1;
      while (pageNo <= MAX_PAGES) {
        try {
          apiCallCount++;
          this.dailyApiUsage++;

          const response = await axios.get<KtoRelatedApiResponse>(endpoint, {
            params: {
              serviceKey,
              numOfRows: ROWS_PER_PAGE,
              pageNo,
              MobileOS: 'ETC',
              MobileApp: 'OISO',
              _type: 'json',
              areaCode: '6', // 부산광역시
            },
            timeout: 8000,
          });

          const body = response.data?.response?.body;
          const rawItems = body?.items?.item;
          const items = Array.isArray(rawItems)
            ? rawItems
            : rawItems
              ? [rawItems]
              : [];

          if (items.length === 0) {
            break;
          }

          collectedCount += items.length;

          for (const item of items) {
            try {
              // rlteTatsNm 또는 tatsNm 장소명 확인
              const placeName = String(
                item.rlteTatsNm || item.tatsNm || '',
              ).trim();
              if (!placeName) continue;

              const existingPlace =
                await this.routeRepository.findPlaceByName(placeName);
              if (existingPlace) {
                matchedPlaceCount++;
                // 연관 순위에 따른 프리미엄 지수 가중치 산정 (1위~50위)
                const rank = Number(item.rlteRank) || 25;
                const calculatedPremium = Math.max(
                  50,
                  Math.min(99, 100 - rank),
                );
                await this.routeRepository.updatePlacePremiumIndex(
                  existingPlace.id,
                  calculatedPremium,
                );
              }
            } catch (itemErr: unknown) {
              failureCount++;
              const errMsg =
                itemErr instanceof Error ? itemErr.message : String(itemErr);
              this.logger.warn(`연관 관광지 매칭 실패: ${errMsg}`);
            }
          }

          const totalCount = body?.totalCount ?? 0;
          if (
            pageNo * ROWS_PER_PAGE >= totalCount ||
            items.length < ROWS_PER_PAGE
          ) {
            break;
          }

          pageNo++;
        } catch (apiErr: unknown) {
          failureCount++;
          const errMsg =
            apiErr instanceof Error ? apiErr.message : String(apiErr);
          lastErrorMsg = errMsg;
          this.logger.error(
            `TarRlteTarService1 (page ${pageNo}) API 호출 실패: ${errMsg}`,
          );
          break;
        }
      }

      this.lastCollectedAt = new Date();
      this.matchedPlaceCount = matchedPlaceCount;
      this.lastResult =
        failureCount === 0
          ? 'SUCCESS'
          : collectedCount > 0
            ? 'PARTIAL_SUCCESS'
            : 'FAILURE';
      this.lastMessage =
        collectedCount === 0 && failureCount > 0
          ? `TarRlteTarService1 API 호출 실패: ${lastErrorMsg ?? '알 수 없는 오류'}`
          : `한국관광공사 연관관광지 동기화 완료 (수집: ${collectedCount}건, DB매칭: ${matchedPlaceCount}건)`;
    } finally {
      this.isRunning = false;
    }

    this.logger.log(
      `연관관광지 동기화 완료 (수집: ${collectedCount}건, DB매칭: ${matchedPlaceCount}건, 실패: ${failureCount}건, API호출: ${apiCallCount}건)`,
    );

    return { collectedCount, matchedPlaceCount, failureCount, apiCallCount };
  }
}
