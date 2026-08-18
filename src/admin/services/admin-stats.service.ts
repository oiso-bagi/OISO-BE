import {
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AdminKtoCollectResponseDto,
  AdminKtoStatusResponseDto,
} from '@/admin/dto/admin-kto-status-response.dto';
import {
  AdminSavingsBreakdownResponseDto,
  AdminStatsOverviewResponseDto,
} from '@/admin/dto/admin-stats-response.dto';
import { AdminStatsRepository } from '@/admin/repositories/admin-stats.repository';
import { RouteCongestionCronService } from '@/route/services/route-congestion-cron.service';

@Injectable()
export class AdminStatsService {
  private lastCollectedAt: Date | null = null;
  private isCollecting = false;
  private dailyApiUsage = 0;

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
    const { totalSavingsCostWon, breakdown } =
      await this.adminStatsRepository.getSavingsBreakdownByCategory();

    return {
      totalSavingsCostWon,
      breakdown,
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
        throw new ServiceUnavailableException(
          'KTO 경로 혼잡도 수동 수집이 실패하였습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      const completedAt: Date = new Date();
      this.lastCollectedAt = completedAt;

      return {
        message:
          failureCount > 0
            ? `KTO 경로 혼잡도 수동 수집이 부분 완료되었습니다. (성공: ${updatedCount}건, 실패: ${failureCount}건)`
            : 'KTO 경로 혼잡도 수동 수집이 성공적으로 완료되었습니다.',
        collectedAt: completedAt,
        updatedPlaceCount: updatedCount,
        failureCount,
      };
    } finally {
      this.isCollecting = false;
    }
  }
}
