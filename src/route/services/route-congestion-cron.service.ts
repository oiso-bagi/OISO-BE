import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CongestionLevel, RouteType } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class RouteCongestionCronService {
  private readonly logger = new Logger(RouteCongestionCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매일 새벽 04:00 일괄 배치 실행 (일일 API 1,000회 한도 완전 방어)
   * 관광지 집중률 방문자 추이 예측 정보 API(TatsCnctrRateService) 수집 및 DB Caching 갱신
   */
  @Cron('0 4 * * *')
  async handleRouteCongestionUpdate() {
    this.logger.log(
      '⏰ [Cron Job] 매일 새벽 04:00 - 관광지 집중률 예측 데이터 수집 및 DB Caching 갱신 시작...',
    );

    const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
    const serviceKey = rawApiKey ? decodeURIComponent(rawApiKey) : '';

    try {
      const activeRoutes = await this.prisma.route.findMany({
        where: { routeType: RouteType.RECOMMENDED, isPublished: true },
        select: { id: true, name: true, region: true },
      });

      this.logger.log(
        `📌 혼잡도 갱신 대상 추천 경로: 총 ${activeRoutes.length}건`,
      );

      const regionalCache = new Map<string, CongestionLevel>();
      let updatedCount = 0;
      let failureCount = 0;

      for (const route of activeRoutes) {
        try {
          const regionalCodes = this.getRegionalCodes(route.region);
          const cacheKey = regionalCodes
            ? `${regionalCodes.areaCd}_${regionalCodes.signguCd}`
            : null;

          let nextCongestion: CongestionLevel;
          if (cacheKey && regionalCache.has(cacheKey)) {
            nextCongestion = regionalCache.get(cacheKey)!;
          } else {
            nextCongestion = await this.fetchAndCalculateCongestion(
              route.id,
              serviceKey,
              route.region,
            );
            if (cacheKey) {
              regionalCache.set(cacheKey, nextCongestion);
            }
          }

          await this.prisma.route.update({
            where: { id: route.id },
            data: { congestionLevel: nextCongestion },
          });
          updatedCount++;
        } catch (error: unknown) {
          failureCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `❌ [Cron Job] 경로 혼잡도 갱신 실패 (routeId: ${route.id}): ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `✅ [Cron Job] 일별 기준 혼잡도 DB Caching 갱신 완료 (성공: ${updatedCount}건, 실패: ${failureCount}건)`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ [Cron Job] 경로 혼잡도 배치 조회 실패: ${errorMessage}`,
      );
    }
  }

  /**
   * 지역 매핑 헬퍼 (부산 광역시 areaCd: 6, signguCd: 1 필수 리턴)
   */
  getRegionalCodes(
    region?: string,
  ): { areaCd: string; signguCd: string } | null {
    if (!region || region.includes('부산')) {
      return { areaCd: '6', signguCd: '1' };
    }
    return null;
  }

  /**
   * 한국관광공사 TatsCnctrRateService (관광지 집중률 예측 API) 연동 및 Fallback 혼잡도 계산
   */
  async fetchAndCalculateCongestion(
    routeId: string,
    serviceKey: string,
    region?: string,
  ): Promise<CongestionLevel> {
    const regionalCodes = this.getRegionalCodes(region);
    if (!regionalCodes || !regionalCodes.areaCd || !regionalCodes.signguCd) {
      return this.calculateRouteCongestion(routeId);
    }

    if (serviceKey) {
      try {
        const endpoint =
          'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList';
        const response = await axios.get(endpoint, {
          params: {
            serviceKey,
            areaCd: regionalCodes.areaCd,
            signguCd: regionalCodes.signguCd,
            numOfRows: 10,
            pageNo: 1,
            MobileOS: 'ETC',
            MobileApp: 'AppTest',
            _type: 'json',
          },
          timeout: 5000,
        });

        const resData = response.data as {
          response?: {
            body?: {
              items?: {
                item?: Array<{ cnctrRate?: number | string }>;
              };
            };
          };
        };

        const items = resData?.response?.body?.items?.item;
        if (Array.isArray(items) && items.length > 0) {
          const rawRate = items[0]?.cnctrRate;
          if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
            const avgRate = Number(rawRate);
            if (Number.isFinite(avgRate) && avgRate >= 0 && avgRate <= 100) {
              if (avgRate >= 75) return CongestionLevel.HIGH;
              if (avgRate >= 40) return CongestionLevel.MEDIUM;
              return CongestionLevel.LOW;
            }
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `⚠️ TatsCnctrRateService API 연동 실패 (routeId: ${routeId}): ${errorMessage}. 시간대별 Fallback으로 전환합니다.`,
        );
      }
    }

    return this.calculateRouteCongestion(routeId);
  }

  /**
   * 시간대별 체감 혼잡도 가중치 연산 (피크타임 및 야간)
   */
  calculateRouteCongestion(
    routeId: string,
    targetHour?: number,
  ): CongestionLevel {
    if (!routeId) {
      return CongestionLevel.MEDIUM;
    }

    const currentHour = targetHour ?? new Date().getHours();

    // 12시~17시: 피크 시간대 (HIGH)
    if (currentHour >= 12 && currentHour <= 17) {
      return CongestionLevel.HIGH;
    }
    // 10시~11시, 18시~20시: 일반 시간대 (MEDIUM)
    if (
      (currentHour >= 10 && currentHour <= 11) ||
      (currentHour >= 18 && currentHour <= 20)
    ) {
      return CongestionLevel.MEDIUM;
    }
    // 21시~09시: 야간/새벽 시간대 (LOW)
    return CongestionLevel.LOW;
  }
}
