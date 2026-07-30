import { BadRequestException, Injectable } from '@nestjs/common';
import { SavingsDashboardResponseDto } from '@/dashboard/dto/savings-dashboard-response.dto';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSavingsDashboard(
    userId: string,
  ): Promise<SavingsDashboardResponseDto> {
    const normalizedUserId = this.validateUserId(userId);
    const [summary, categorySummary, recentTrips] = await Promise.all([
      this.dashboardRepository.findSavingsSummaryByUserId(normalizedUserId),
      this.dashboardRepository.findSavingsCategorySummaryByUserId(
        normalizedUserId,
      ),
      this.dashboardRepository.findRecentCompletedSavingsTripsByUserId(
        normalizedUserId,
      ),
    ]);

    return SavingsDashboardResponseDto.from(
      summary,
      categorySummary,
      recentTrips,
    );
  }

  private validateUserId(userId: string): string {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('사용자 ID는 비어 있을 수 없습니다.');
    }

    return userId.trim();
  }
}
