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
  AdminKtoPlaceCollectResponseDto,
  AdminKtoPlaceStatusResponseDto,
  AdminKtoRelatedCollectResponseDto,
  AdminKtoRelatedStatusResponseDto,
  AdminKtoStatusResponseDto,
} from '@/admin/dto/admin-kto-status-response.dto';
import {
  AdminSavingsBreakdownResponseDto,
  AdminSavingsCategoryItemDto,
  AdminSavingsRegionItemDto,
  AdminStatsOverviewResponseDto,
} from '@/admin/dto/admin-stats-response.dto';
import { AdminStatsRepository } from '@/admin/repositories/admin-stats.repository';
import { KtoPlaceSyncService } from '@/route/services/kto-place-sync.service';
import { KtoRelatedPlaceSyncService } from '@/route/services/kto-related-place-sync.service';
import { RouteCongestionCronService } from '@/route/services/route-congestion-cron.service';

export const CATEGORY_LABEL_MAP: Record<PlaceCategory, string> = {
  FOOD: '식당 / 음식점',
  CAFE: '감성 카페',
  MARKET: '전통시장 / 쇼핑',
  CULTURE: '문화시설',
  NATURE: '자연경관',
  EXPERIENCE: '체험 / 액티비티',
  VIEWPOINT: '전망대 / 야경',
  ETC: '기타',
};

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);
  private lastCollectedAt: Date | null = null;
  private isCollecting = false;
  private dailyApiUsage = 0;
  private lastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null = null;
  private lastMessage: string | null = null;

  private placeLastCollectedAt: Date | null = null;
  private isPlaceCollecting = false;
  private placeDailyApiUsage = 0;
  private placeLastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null =
    null;
  private placeLastMessage: string | null = null;

  private relatedLastCollectedAt: Date | null = null;
  private isRelatedCollecting = false;
  private relatedDailyApiUsage = 0;
  private relatedLastResult: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null =
    null;
  private relatedLastMessage: string | null = null;
  private relatedMatchedPlaceCount = 0;

  constructor(
    private readonly adminStatsRepository: AdminStatsRepository,
    @Optional()
    private readonly routeCongestionCronService?: RouteCongestionCronService,
    @Optional()
    private readonly ktoPlaceSyncService?: KtoPlaceSyncService,
    @Optional()
    private readonly ktoRelatedPlaceSyncService?: KtoRelatedPlaceSyncService,
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

      const catKey = place.category ?? PlaceCategory.ETC;
      const currentCategoryAmount = categoryMap.get(catKey) ?? 0;
      categoryMap.set(catKey, currentCategoryAmount + amount);

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
        label: CATEGORY_LABEL_MAP[category] ?? category,
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

  async getPlaceCollectionStatus(): Promise<AdminKtoPlaceStatusResponseDto> {
    const totalPlaceCount =
      await this.adminStatsRepository.getTargetPlaceCount();

    if (this.ktoPlaceSyncService) {
      const syncStatus = this.ktoPlaceSyncService.getStatus();
      return {
        dailyApiUsage: syncStatus.dailyApiUsage,
        dailyQuotaLimit: syncStatus.dailyQuotaLimit,
        lastCollectedAt: syncStatus.lastCollectedAt,
        status: syncStatus.status,
        lastResult: syncStatus.lastResult,
        lastMessage: syncStatus.lastMessage,
        totalPlaceCount,
      };
    }

    return {
      dailyApiUsage: this.placeDailyApiUsage,
      dailyQuotaLimit: 1000,
      lastCollectedAt: this.placeLastCollectedAt,
      status: this.isPlaceCollecting ? 'RUNNING' : 'IDLE',
      lastResult: this.placeLastResult,
      lastMessage: this.placeLastMessage,
      totalPlaceCount,
    };
  }

  async triggerPlaceCollection(): Promise<AdminKtoPlaceCollectResponseDto> {
    if (!this.ktoPlaceSyncService) {
      throw new ServiceUnavailableException(
        'KTO 관광지 마스터 수집 서비스를 이용할 수 없습니다.',
      );
    }

    if (
      this.isPlaceCollecting ||
      this.ktoPlaceSyncService.getStatus().status === 'RUNNING'
    ) {
      throw new HttpException(
        '관광지 마스터 수집 작업이 이미 진행 중입니다.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const lastAttemptAt =
      this.ktoPlaceSyncService.getLastAttemptAt() ?? this.placeLastCollectedAt;
    if (
      lastAttemptAt &&
      Date.now() - lastAttemptAt.getTime() < TEN_MINUTES_MS
    ) {
      const remainSeconds = Math.ceil(
        (TEN_MINUTES_MS - (Date.now() - lastAttemptAt.getTime())) / 1000,
      );
      throw new HttpException(
        `관광지 마스터 수동 수집 쿨타임이 진행 중입니다. (${remainSeconds}초 후 다시 시도해 주세요)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.isPlaceCollecting = true;

    try {
      const { updatedCount, failureCount, apiCallCount } =
        await this.ktoPlaceSyncService.handlePlaceSync();

      if (updatedCount === 0 && failureCount > 0) {
        throw new ServiceUnavailableException(
          '한국관광공사 관광지 마스터 수동 수집이 실패하였습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      const status = this.ktoPlaceSyncService.getStatus();
      const completedAt: Date = status.lastCollectedAt ?? new Date();
      const message =
        status.lastMessage ??
        (failureCount > 0
          ? `한국관광공사 관광지 마스터 수동 수집이 부분 완료되었습니다. (성공: ${updatedCount}건, 실패: ${failureCount}건)`
          : '한국관광공사 관광지 마스터 수동 수집이 성공적으로 완료되었습니다.');

      return {
        message,
        collectedAt: completedAt,
        updatedPlaceCount: updatedCount,
        failureCount,
        apiCallCount,
      };
    } catch (err) {
      this.logger.error('관광지 마스터 수동 수집 실행 중 예외 발생', err);
      throw err;
    } finally {
      this.isPlaceCollecting = false;
    }
  }

  async getRelatedPlaceCollectionStatus(): Promise<AdminKtoRelatedStatusResponseDto> {
    await Promise.resolve();
    if (this.ktoRelatedPlaceSyncService) {
      const syncStatus = this.ktoRelatedPlaceSyncService.getStatus();
      return {
        dailyApiUsage: syncStatus.dailyApiUsage,
        dailyQuotaLimit: syncStatus.dailyQuotaLimit,
        lastCollectedAt: syncStatus.lastCollectedAt,
        status: syncStatus.status,
        lastResult: syncStatus.lastResult,
        lastMessage: syncStatus.lastMessage,
        matchedPlaceCount: syncStatus.matchedPlaceCount,
      };
    }

    return {
      dailyApiUsage: this.relatedDailyApiUsage,
      dailyQuotaLimit: 1000,
      lastCollectedAt: this.relatedLastCollectedAt,
      status: this.isRelatedCollecting ? 'RUNNING' : 'IDLE',
      lastResult: this.relatedLastResult,
      lastMessage: this.relatedLastMessage,
      matchedPlaceCount: this.relatedMatchedPlaceCount,
    };
  }

  async triggerRelatedPlaceCollection(): Promise<AdminKtoRelatedCollectResponseDto> {
    if (!this.ktoRelatedPlaceSyncService) {
      throw new ServiceUnavailableException(
        'KTO 연관관광지 수집 서비스를 이용할 수 없습니다.',
      );
    }

    if (
      this.isRelatedCollecting ||
      this.ktoRelatedPlaceSyncService.getStatus().status === 'RUNNING'
    ) {
      throw new HttpException(
        '연관관광지 수집 작업이 이미 진행 중입니다.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const lastAttemptAt =
      this.ktoRelatedPlaceSyncService.getLastAttemptAt() ??
      this.relatedLastCollectedAt;
    if (
      lastAttemptAt &&
      Date.now() - lastAttemptAt.getTime() < TEN_MINUTES_MS
    ) {
      const remainSeconds = Math.ceil(
        (TEN_MINUTES_MS - (Date.now() - lastAttemptAt.getTime())) / 1000,
      );
      throw new HttpException(
        `연관관광지 수동 수집 쿨타임이 진행 중입니다. (${remainSeconds}초 후 다시 시도해 주세요)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.isRelatedCollecting = true;

    try {
      const { collectedCount, matchedPlaceCount, failureCount, apiCallCount } =
        await this.ktoRelatedPlaceSyncService.handleRelatedPlaceSync();

      if (collectedCount === 0 && failureCount > 0) {
        throw new ServiceUnavailableException(
          '한국관광공사 연관관광지 수동 수집이 실패하였습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      const status = this.ktoRelatedPlaceSyncService.getStatus();
      const completedAt: Date = status.lastCollectedAt ?? new Date();
      const message =
        status.lastMessage ??
        (failureCount > 0
          ? `한국관광공사 연관관광지 수동 수집이 부분 완료되었습니다. (수집: ${collectedCount}건, 매칭: ${matchedPlaceCount}건, 실패: ${failureCount}건)`
          : '한국관광공사 연관관광지 수동 수집이 성공적으로 완료되었습니다.');

      return {
        message,
        collectedAt: completedAt,
        collectedCount,
        matchedPlaceCount,
        failureCount,
        apiCallCount,
      };
    } catch (err) {
      this.logger.error('연관관광지 수동 수집 실행 중 예외 발생', err);
      throw err;
    } finally {
      this.isRelatedCollecting = false;
    }
  }
}
