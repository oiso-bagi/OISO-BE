import { BadRequestException } from '@nestjs/common';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';
import { DashboardService } from '@/dashboard/services/dashboard.service';

describe('DashboardService', () => {
  const mockDashboardRepository = {
    findSavingsSummaryByUserId: jest.fn(),
    findSavingsCategorySummaryByUserId: jest.fn(),
    findRecentCompletedSavingsTripsByUserId: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      mockDashboardRepository as unknown as DashboardRepository,
    );
  });

  it('loads completed trips for the normalized user id', async () => {
    mockDashboardRepository.findSavingsSummaryByUserId.mockResolvedValue({
      tripCount: 0,
      totalSavingsWon: 0,
      localContributionScore: 0,
    });
    mockDashboardRepository.findSavingsCategorySummaryByUserId.mockResolvedValue(
      {
        foodSavingsWon: 0,
        transportSavingsWon: 0,
        experienceSavingsWon: 0,
      },
    );
    mockDashboardRepository.findRecentCompletedSavingsTripsByUserId.mockResolvedValue(
      [],
    );

    const result = await service.getSavingsDashboard(' user-1 ');

    expect(
      mockDashboardRepository.findSavingsSummaryByUserId,
    ).toHaveBeenCalledWith('user-1');
    expect(
      mockDashboardRepository.findSavingsCategorySummaryByUserId,
    ).toHaveBeenCalledWith('user-1');
    expect(
      mockDashboardRepository.findRecentCompletedSavingsTripsByUserId,
    ).toHaveBeenCalledWith('user-1');
    expect(result.totalSavingsWon).toBe(0);
  });

  it('rejects an empty user id', async () => {
    await expect(service.getSavingsDashboard(' ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      mockDashboardRepository.findSavingsSummaryByUserId,
    ).not.toHaveBeenCalled();
    expect(
      mockDashboardRepository.findSavingsCategorySummaryByUserId,
    ).not.toHaveBeenCalled();
    expect(
      mockDashboardRepository.findRecentCompletedSavingsTripsByUserId,
    ).not.toHaveBeenCalled();
  });
});
