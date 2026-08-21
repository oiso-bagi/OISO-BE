import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlaceCategory } from '@prisma/client';
import {
  AdminKtoCollectResponseDto,
  AdminKtoStatusResponseDto,
} from '@/admin/dto/admin-kto-status-response.dto';
import {
  AdminSavingsBreakdownResponseDto,
  AdminSavingsCategoryItemDto,
  AdminSavingsRegionItemDto,
  AdminStatsOverviewResponseDto,
} from '@/admin/dto/admin-stats-response.dto';
import { CATEGORY_LABEL_MAP } from '@/admin/repositories/admin-stats.repository';
import { AdminStatsRepository } from '@/admin/repositories/admin-stats.repository';
import { RouteCongestionCronService } from '@/route/services/route-congestion-cron.service';

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);
  private lastCollectedAt: Date | null = null;
  private isCollecting = false;
  private dailyApiUsage = 0;
  private lastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null = null;
  private lastMessage: string | null = null;

  constructor(
    private readonly adminStatsRepository: AdminStatsRepository,
    @Optional()
    private readonly routeCongestionCronService?: RouteCongestionCronService,
  ) {}

  async getStatsOverview(): Promise<AdminStatsOverviewResponseDto> {
    const [totalUserCount, totalSavedRouteCount, savingsAndContribution] =
      await Promise.all([
        this.adminStatsRepository.getUserCount(),
        this.adminStatsRepository.getSavedRouteCount(),
        this.adminStatsRepository.getSavingsCostAndContribution(),
      ]);

    return {
      totalUserCount,
      totalSavedRouteCount,
      totalSavingsCostWon: savingsAndContribution.totalSavingsCostWon ?? 0,
      averageLocalContributionScore:
        savingsAndContribution.averageLocalContributionScore ?? 0,
    };
  }

  async getSavingsBreakdown(): Promise<AdminSavingsBreakdownResponseDto> {
    const { stopAggregates, places } =
      await this.adminStatsRepository.getRawSavingsBreakdown();

    if (stopAggregates.length === 0 || places.length === 0) {
      return {
        totalSavingsCostWon: 0,
        breakdown: [],
        regionBreakdown: [],
      };
    }

    const placeMap = new Map(places.map((p) => [p.id, p]));
    const categoryMap = new Map<PlaceCategory, number>();
    const regionMap = new Map<string, number>();
    let totalSavingsCostWon = 0;

    for (const stopAgg of stopAggregates) {
      const place = placeMap.get(stopAgg.placeId);
      if (!place) continue;

      const amount = stopAgg._sum.savingsWon ?? 0;
      totalSavingsCostWon += amount;

      if (place.category) {
        const currentCategoryAmount = categoryMap.get(place.category) ?? 0;
        categoryMap.set(place.category, currentCategoryAmount + amount);
      }

      let regionName = '기타 상권';
      if (place.address) {
        const districtMatch = place.address.match(/([가-힣]+구)/);
        if (districtMatch && districtMatch[1]) {
          regionName = districtMatch[1];
        }
      }

      const currentRegionAmount = regionMap.get(regionName) ?? 0;
      regionMap.set(regionName, currentRegionAmount + amount);
    }

    const breakdown: AdminSavingsCategoryItemDto[] = [];
    categoryMap.forEach((amountWon, category) => {
      const percentage =
        totalSavingsCostWon > 0
          ? Number(((amountWon / totalSavingsCostWon) * 100).toFixed(1))
          : 0;

      breakdown.push({
        category,
        label: (CATEGORY_LABEL_MAP && CATEGORY_LABEL_MAP[category]) || category,
        amountWon,
        percentage,
      });
    });
    breakdown.sort((a, b) => b.amountWon - a.amountWon);

    const regionBreakdown: AdminSavingsRegionItemDto[] = [];
    regionMap.forEach((amountWon, region) => {
      const percentage =
        totalSavingsCostWon > 0
          ? Number(((amountWon / totalSavingsCostWon) * 100).toFixed(1))
          : 0;

      regionBreakdown.push({
        region,
        label: region,
        amountWon,
        percentage,
      });
    });
    regionBreakdown.sort((a, b) => b.amountWon - a.amountWon);

    return {
      totalSavingsCostWon,
      breakdown,
      regionBreakdown,
    };
  }

  async getKtoStatus(): Promise<AdminKtoStatusResponseDto> {
    const targetPlaceCount =
      await this.adminStatsRepository.getTargetPlaceCount();

    return {
      dailyApiUsage: this.dailyApiUsage,
      dailyQuotaLimit: 1000,
      lastCollectedAt: this.lastCollectedAt,
      status: this.isCollecting ? 'RUNNING' : 'IDLE',
      lastResult: this.lastResult,
      lastMessage: this.lastMessage,
      targetPlaceCount,
    };
  }

  async triggerKtoCollection(): Promise<AdminKtoCollectResponseDto> {
    if (!this.routeCongestionCronService) {
      throw new ServiceUnavailableException(
        'KTO 경로 혼잡도 수집 서비스를 이용할 수 없습니다.',
      );
    }

    if (this.isCollecting) {
      throw new HttpException(
        'KTO 수집 작업이 이미 진행 중입니다.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 10분 쿨타임 검증 (600,000 ms)
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    if (
      this.lastCollectedAt &&
      Date.now() - this.lastCollectedAt.getTime() < TEN_MINUTES_MS
    ) {
      const remainSeconds = Math.ceil(
        (TEN_MINUTES_MS - (Date.now() - this.lastCollectedAt.getTime())) / 1000,
      );
      throw new HttpException(
        `KTO 수동 수집 쿨타임이 진행 중입니다. (${remainSeconds}초 후 다시 시도해 주세요)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.isCollecting = true;

    try {
      const { updatedCount, failureCount, apiCallCount } =
        await this.routeCongestionCronService.handleRouteCongestionUpdate();

      this.dailyApiUsage = Math.min(1000, this.dailyApiUsage + apiCallCount);

      if (updatedCount === 0 && failureCount > 0) {
        this.lastResult = 'FAILURE';
        this.lastMessage =
          'KTO 경로 혼잡도 수동 수집이 실패하였습니다. 잠시 후 다시 시도해 주세요.';
        throw new ServiceUnavailableException(this.lastMessage);
      }

      const completedAt: Date = new Date();
      this.lastCollectedAt = completedAt;
      this.lastResult = failureCount > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS';
      this.lastMessage =
        failureCount > 0
          ? `KTO 경로 혼잡도 수동 수집이 부분 완료되었습니다. (성공: ${updatedCount}건, 실패: ${failureCount}건)`
          : 'KTO 경로 혼잡도 수동 수집이 성공적으로 완료되었습니다.';

      return {
        message: this.lastMessage,
        collectedAt: completedAt,
        updatedPlaceCount: updatedCount,
        failureCount,
      };
    } catch (err) {
      this.logger.error('KTO 수동 수집 실행 중 예외 발생', err);
      if (!(err instanceof ServiceUnavailableException)) {
        this.lastResult = 'FAILURE';
        this.lastMessage =
          'KTO 경로 혼잡도 수동 수집 도중 예외가 발생했습니다.';
      }
      throw err;
    } finally {
      this.isCollecting = false;
    }
  }
}
