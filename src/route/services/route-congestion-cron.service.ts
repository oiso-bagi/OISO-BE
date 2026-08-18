import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CongestionLevel } from '@prisma/client';
import axios from 'axios';
import { RouteRepository } from '@/route/repositories/route.repository';

@Injectable()
export class RouteCongestionCronService {
  private readonly logger = new Logger(RouteCongestionCronService.name);

  constructor(private readonly routeRepository: RouteRepository) {}

  @Cron('0 4 * * *')
  async handleRouteCongestionUpdate(): Promise<{
    updatedCount: number;
    failureCount: number;
  }> {
    this.logger.log('추천 경로 혼잡도 갱신을 시작합니다.');

    const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
    const serviceKey = rawApiKey ? decodeURIComponent(rawApiKey) : '';

    let updatedCount = 0;
    let failureCount = 0;

    try {
      const activeRoutes =
        await this.routeRepository.findPublishedRecommendedRouteCongestionTargets();

      this.logger.log(`혼잡도 갱신 대상 추천 경로: ${activeRoutes.length}건`);

      const regionalCache = new Map<string, CongestionLevel>();

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

          await this.routeRepository.updateRouteCongestionLevel(
            route.id,
            nextCongestion,
          );
          updatedCount++;
        } catch (error: unknown) {
          failureCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `경로 혼잡도 갱신 실패 (routeId: ${route.id}): ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `추천 경로 혼잡도 갱신 완료 (성공: ${updatedCount}건, 실패: ${failureCount}건)`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`경로 혼잡도 갱신 대상 조회 실패: ${errorMessage}`);
    }

    return { updatedCount, failureCount };
  }

  getRegionalCodes(
    region?: string,
  ): { areaCd: string; signguCd: string } | null {
    if (!region || region.includes('부산')) {
      return { areaCd: '6', signguCd: '1' };
    }

    return null;
  }

  async fetchAndCalculateCongestion(
    routeId: string,
    serviceKey: string,
    region?: string,
  ): Promise<CongestionLevel> {
    const regionalCodes = this.getRegionalCodes(region);
    if (!regionalCodes) {
      return this.calculateRouteCongestion(routeId);
    }

    if (serviceKey) {
      try {
        const response = await axios.get(
          'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList',
          {
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
          },
        );

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
        const rawRate = Array.isArray(items) ? items[0]?.cnctrRate : undefined;

        if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
          const avgRate = Number(rawRate);
          if (Number.isFinite(avgRate) && avgRate >= 0 && avgRate <= 100) {
            if (avgRate >= 75) return CongestionLevel.HIGH;
            if (avgRate >= 40) return CongestionLevel.MEDIUM;
            return CongestionLevel.LOW;
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `TatsCnctrRateService 연동 실패 (routeId: ${routeId}): ${errorMessage}. 시간대 기준 fallback을 사용합니다.`,
        );
      }
    }

    return this.calculateRouteCongestion(routeId);
  }

  calculateRouteCongestion(
    routeId: string,
    targetHour?: number,
  ): CongestionLevel {
    if (!routeId) {
      return CongestionLevel.MEDIUM;
    }

    const currentHour = targetHour ?? new Date().getHours();

    if (currentHour >= 12 && currentHour <= 17) {
      return CongestionLevel.HIGH;
    }

    if (
      (currentHour >= 10 && currentHour <= 11) ||
      (currentHour >= 18 && currentHour <= 20)
    ) {
      return CongestionLevel.MEDIUM;
    }

    return CongestionLevel.LOW;
  }
}
