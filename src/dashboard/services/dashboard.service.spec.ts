import { BadRequestException } from '@nestjs/common';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';
import { DashboardService } from '@/dashboard/services/dashboard.service';

describe('DashboardService', () => {
  const mockDashboardRepository = {
    findSavingsSummaryByUserId: jest.fn(),
    findSavingsCategorySummaryByUserId: jest.fn(),
    findRecentCompletedSavingsTripsByUserId: jest.fn(),
    findCompletedSavingsTripsByUserId: jest.fn(),
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
        foodBudgetWon: 0,
        foodEstimatedCostWon: 0,
        transportSavingsWon: 0,
        transportBudgetWon: 0,
        transportEstimatedCostWon: 0,
        experienceSavingsWon: 0,
        experienceBudgetWon: 0,
        experienceEstimatedCostWon: 0,
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

  it('loads paginated savings histories for the normalized user id', async () => {
    mockDashboardRepository.findCompletedSavingsTripsByUserId.mockResolvedValue(
      {
        items: [
          {
            id: 'trip-1',
            startedAt: new Date('2026-07-31T03:00:00.000Z'),
            route: {
              id: 'route_001',
              name: 'Busan sea route',
              estimatedSavingsWon: 15000,
              foodCostWon: 15000,
              transportCostWon: 10000,
              experienceCostWon: 20000,
            },
          },
        ],
        totalCount: 25,
      },
    );

    const result = await service.getSavingsHistories(' user-1 ', {
      page: 1,
      size: 10,
    });

    expect(
      mockDashboardRepository.findCompletedSavingsTripsByUserId,
    ).toHaveBeenCalledWith('user-1', 1, 10);
    expect(result).toEqual({
      items: [
        {
          routeId: 'route_001',
          routeName: 'Busan sea route',
          trippedAt: new Date('2026-07-31T03:00:00.000Z'),
          savedAmountWon: 15000,
        },
      ],
      page: 1,
      size: 10,
      totalCount: 25,
      totalPages: 3,
    });
  });

  it('rejects an empty user id when loading paginated savings histories', async () => {
    await expect(
      service.getSavingsHistories(' ', { page: 1, size: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      mockDashboardRepository.findCompletedSavingsTripsByUserId,
    ).not.toHaveBeenCalled();
  });
});
