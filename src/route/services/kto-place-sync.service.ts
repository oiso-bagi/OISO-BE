import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlaceCategory, Prisma } from '@prisma/client';
import axios from 'axios';
import { RouteRepository } from '@/route/repositories/route.repository';

export interface KtoAreaBasedItem {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  sigungucode?: string;
  contenttypeid?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  [key: string]: unknown;
}

export interface KtoApiResponse {
  response?: {
    body?: {
      items?: {
        item?: KtoAreaBasedItem[];
      };
    };
  };
}

export function mapItemToCategory(item: KtoAreaBasedItem): PlaceCategory {
  const code = String(item.contenttypeid || '').trim();
  const cat1 = String(item.cat1 || '').trim();
  const cat2 = String(item.cat2 || '').trim();
  const cat3 = String(item.cat3 || '').trim();
  const titleText = String(item.title || '');

  // 1순위: VIEWPOINT
  if (
    cat3 === 'A01011800' ||
    cat3 === 'A02020700' ||
    cat3 === 'A02030600' ||
    cat3 === 'A03021600' ||
    titleText.includes('전망대') ||
    titleText.includes('스카이워크') ||
    titleText.includes('야경') ||
    titleText.includes('루프탑') ||
    titleText.includes('포토존') ||
    titleText.includes('케이블카') ||
    titleText.includes('타워') ||
    titleText.includes('해넘이') ||
    titleText.includes('일출')
  ) {
    return PlaceCategory.VIEWPOINT;
  }

  // 2순위: CAFE
  if (
    cat3 === 'A05020900' ||
    titleText.includes('로스터리') ||
    titleText.includes('에스프레소') ||
    titleText.includes('베이커리') ||
    titleText.includes('제과') ||
    titleText.includes('찻집') ||
    titleText.includes('디저트') ||
    titleText.toLowerCase().includes('cafe') ||
    (titleText.includes('카페') && !titleText.includes('카페거리'))
  ) {
    return PlaceCategory.CAFE;
  }

  // 3순위: CULTURE
  if (
    code === '14' ||
    cat1 === 'A02' ||
    cat2 === 'A0206' ||
    titleText.includes('박물관') ||
    titleText.includes('미술관') ||
    titleText.includes('전시관') ||
    titleText.includes('갤러리') ||
    titleText.includes('기념관') ||
    titleText.includes('역사관') ||
    titleText.includes('서원') ||
    titleText.includes('향교')
  ) {
    return PlaceCategory.CULTURE;
  }

  // 4순위: EXPERIENCE
  if (
    code === '15' ||
    code === '28' ||
    cat1 === 'A03' ||
    titleText.includes('체험') ||
    titleText.includes('요트') ||
    titleText.includes('서핑') ||
    titleText.includes('해양') ||
    titleText.includes('레포츠') ||
    titleText.includes('루지') ||
    titleText.includes('공원') ||
    titleText.includes('아쿠아리움') ||
    titleText.includes('클럽') ||
    titleText.includes('볼링') ||
    titleText.includes('골프') ||
    titleText.includes('승마') ||
    titleText.includes('사격') ||
    titleText.includes('카트') ||
    titleText.includes('워터') ||
    titleText.includes('스파') ||
    titleText.includes('온천')
  ) {
    return PlaceCategory.EXPERIENCE;
  }

  // 5순위: MARKET
  if (
    code === '38' ||
    cat2 === 'A0401' ||
    titleText.includes('시장') ||
    titleText.includes('상가') ||
    titleText.includes('몰') ||
    titleText.includes('아울렛') ||
    titleText.includes('백화점')
  ) {
    return PlaceCategory.MARKET;
  }

  // 6순위: FOOD
  if (code === '39' || cat1 === 'A05') {
    return PlaceCategory.FOOD;
  }

  // 7순위: NATURE
  if (code === '12' || cat1 === 'A01') {
    return PlaceCategory.NATURE;
  }

  return PlaceCategory.ETC;
}

export function parseTimeString(text: string): {
  openTime: string | null;
  closeTime: string | null;
} {
  if (!text) return { openTime: null, closeTime: null };
  const cleanText = String(text).trim();

  const timeMatch = cleanText.match(/(\d{1,2}:\d{2})/g);
  if (timeMatch && timeMatch.length >= 2) {
    const formatTime = (t: string) => (t.length === 4 ? `0${t}` : t);
    return {
      openTime: formatTime(timeMatch[0]),
      closeTime: formatTime(timeMatch[1]),
    };
  }

  const koreanTimeMatch = Array.from(
    cleanText.matchAll(/(\d{1,2})\s*시\s*(\d{1,2})?분?/g),
  );
  if (koreanTimeMatch && koreanTimeMatch.length >= 2) {
    const toHHMM = (m: RegExpMatchArray) => {
      const hour = String(m[1]).padStart(2, '0');
      const min = m[2] ? String(m[2]).padStart(2, '0') : '00';
      return `${hour}:${min}`;
    };
    return {
      openTime: toHHMM(koreanTimeMatch[0]),
      closeTime: toHHMM(koreanTimeMatch[1]),
    };
  }

  if (timeMatch && timeMatch.length === 1) {
    const t = timeMatch[0];
    return { openTime: t.length === 4 ? `0${t}` : t, closeTime: null };
  }

  if (cleanText.includes('상시') || cleanText.includes('24시간')) {
    return { openTime: '00:00', closeTime: '23:59' };
  }

  return { openTime: null, closeTime: null };
}

export interface KtoPlaceSyncStatus {
  dailyApiUsage: number;
  dailyQuotaLimit: number;
  lastCollectedAt: Date | null;
  lastAttemptAt: Date | null;
  status: 'IDLE' | 'RUNNING';
  lastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null;
  lastMessage: string | null;
}

@Injectable()
export class KtoPlaceSyncService {
  private readonly logger = new Logger(KtoPlaceSyncService.name);

  private isRunning = false;
  private lastCollectedAt: Date | null = null;
  private lastAttemptAt: Date | null = null;
  private lastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null = null;
  private lastMessage: string | null = null;
  private dailyApiUsage = 0;
  private lastApiUsageDate: string | null = null;

  constructor(private readonly routeRepository: RouteRepository) {}

  private safeDecodeApiKey(rawKey: string): string {
    try {
      const decoded = decodeURIComponent(rawKey);
      if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
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

  getStatus(): KtoPlaceSyncStatus {
    this.checkAndResetDailyUsage();
    return {
      dailyApiUsage: this.dailyApiUsage,
      dailyQuotaLimit: 1000,
      lastCollectedAt: this.lastCollectedAt,
      lastAttemptAt: this.lastAttemptAt,
      status: this.isRunning ? 'RUNNING' : 'IDLE',
      lastResult: this.lastResult,
      lastMessage: this.lastMessage,
    };
  }

  @Cron('0 5 * * *')
  async handlePlaceSync(): Promise<{
    updatedCount: number;
    failureCount: number;
    apiCallCount: number;
  }> {
    this.checkAndResetDailyUsage();

    if (this.isRunning) {
      this.logger.warn('관광지 마스터 동기화 작업이 이미 실행 중입니다.');
      return { updatedCount: 0, failureCount: 0, apiCallCount: 0 };
    }

    this.isRunning = true;
    this.lastAttemptAt = new Date();
    this.logger.log(
      '한국관광공사(KorService2) 관광지 마스터 정기 동기화를 시작합니다.',
    );

    const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
    const serviceKey = rawApiKey ? this.safeDecodeApiKey(rawApiKey) : '';

    let updatedCount = 0;
    let failureCount = 0;
    let apiCallCount = 0;

    if (!serviceKey) {
      this.logger.warn(
        'VK_KORSERVICE2_API_KEY가 설정되지 않아 장소 동기화를 건너뜁니다.',
      );
      this.isRunning = false;
      this.lastResult = 'FAILURE';
      this.lastMessage = 'API 키가 설정되지 않았습니다.';
      return { updatedCount, failureCount: 1, apiCallCount };
    }

    const contentTypes = ['12', '14', '15', '28', '38', '39'];
    const endpoint =
      'https://apis.data.go.kr/B551011/KorService2/areaBasedList2';
    const BUSAN_BOUNDS = {
      minLat: 34.88,
      maxLat: 35.4,
      minLng: 128.74,
      maxLng: 129.32,
    };

    for (const contentTypeId of contentTypes) {
      try {
        apiCallCount++;
        const response = await axios.get<KtoApiResponse>(endpoint, {
          params: {
            serviceKey,
            numOfRows: 30,
            pageNo: 1,
            MobileOS: 'ETC',
            MobileApp: 'OISO',
            _type: 'json',
            areaCode: '6', // 부산광역시
            contentTypeId,
          },
          timeout: 10000,
        });

        const items = response.data?.response?.body?.items?.item;
        if (!Array.isArray(items)) {
          continue;
        }

        for (const item of items) {
          try {
            const contentId = item.contentid
              ? String(item.contentid).trim()
              : '';
            const mapX = item.mapx ? String(item.mapx).trim() : '';
            const mapY = item.mapy ? String(item.mapy).trim() : '';

            if (!contentId || !mapX || !mapY) {
              continue;
            }

            const lng = parseFloat(mapX);
            const lat = parseFloat(mapY);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              continue;
            }

            if (
              lat < BUSAN_BOUNDS.minLat ||
              lat > BUSAN_BOUNDS.maxLat ||
              lng < BUSAN_BOUNDS.minLng ||
              lng > BUSAN_BOUNDS.maxLng
            ) {
              continue;
            }

            const category = mapItemToCategory(item);
            const hours = parseTimeString(String(item.title || ''));

            await this.routeRepository.upsertPlaceFromKto(contentId, {
              name: item.title ? String(item.title).trim() : '이름 없음',
              address: item.addr1 ? String(item.addr1).trim() : null,
              roadAddress: item.addr2 ? String(item.addr2).trim() : null,
              region: '부산광역시',
              district: item.sigungucode ? `시군구-${item.sigungucode}` : null,
              category,
              latitude: new Prisma.Decimal(lat),
              longitude: new Prisma.Decimal(lng),
              elevationMeters: 15,
              openTime: hours.openTime,
              closeTime: hours.closeTime,
              isActive: true,
            });

            updatedCount++;
          } catch (itemErr: unknown) {
            failureCount++;
            const errMsg =
              itemErr instanceof Error ? itemErr.message : String(itemErr);
            this.logger.warn(
              `장소 upsert 실패 (contentId: ${item?.contentid}): ${errMsg}`,
            );
          }
        }
      } catch (apiErr: unknown) {
        failureCount++;
        const errMsg =
          apiErr instanceof Error ? apiErr.message : String(apiErr);
        this.logger.error(
          `KorService2 (${contentTypeId}) 호출 실패: ${errMsg}`,
        );
      }
    }

    this.logger.log(
      `관광지 마스터 동기화 완료 (갱신: ${updatedCount}건, 실패: ${failureCount}건, API 호출: ${apiCallCount}건)`,
    );

    return { updatedCount, failureCount, apiCallCount };
  }
}
