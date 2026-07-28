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
        select: { id: true, name: true },
      });

      this.logger.log(
        `📌 혼잡도 갱신 대상 추천 경로: 총 ${activeRoutes.length}건`,
      );

      let updatedCount = 0;
      for (const route of activeRoutes) {
        const nextCongestion = await this.fetchAndCalculateCongestion(
          route.id,
          serviceKey,
        );

        await this.prisma.route.update({
          where: { id: route.id },
          data: { congestionLevel: nextCongestion },
        });
        updatedCount++;
      }

      this.logger.log(
        `✅ [Cron Job] 일별 기준 혼잡도 DB Caching 갱신 완료 (${updatedCount}건 갱신)`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ [Cron Job] 경로 혼잡도 갱신 중 오류 발생: ${errorMessage}`,
      );
    }
  }

  /**
   * 한국관광공사 TatsCnctrRateService (관광지 집중률 예측 API) 연동 및 Fallback 혼잡도 계산
   */
  async fetchAndCalculateCongestion(
    routeId: string,
    serviceKey: string,
  ): Promise<CongestionLevel> {
    if (serviceKey) {
      try {
        const endpoint =
          'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRateList';
        const response = await axios.get(endpoint, {
          params: {
            serviceKey,
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
          // 수집된 집중률 지수에 따른 혼잡도 맵핑
          const avgRate = Number(items[0]?.cnctrRate ?? 50);
          if (avgRate >= 75) return CongestionLevel.HIGH;
          if (avgRate >= 40) return CongestionLevel.MEDIUM;
          return CongestionLevel.LOW;
        }
      } catch {
        // 외부 API 실패 시 안전하게 시간대/논리적 Fallback으로 전환
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
