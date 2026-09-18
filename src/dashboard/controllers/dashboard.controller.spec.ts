import { DashboardController } from '@/dashboard/controllers/dashboard.controller';
import { DashboardService } from '@/dashboard/services/dashboard.service';

describe('DashboardController', () => {
  const mockDashboardService = {
    getSavingsDashboard: jest.fn(),
    getSavingsHistories: jest.fn(),
  };

  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(
      mockDashboardService as unknown as DashboardService,
    );
  });

  it('delegates savings dashboard retrieval with the current user id', async () => {
    const response = {
      totalSavingsWon: 0,
      tripCount: 0,
      averageSavingsWon: 0,
      savingsByCategory: [],
      localContribution: {
        scorePercent: 0,
        label: '외곽·원도심 상권 방문',
        message: '관광 수요 분산에 기여하고 있어요',
      },
      histories: [],
    };
    mockDashboardService.getSavingsDashboard.mockResolvedValue(response);

    await expect(
      controller.getSavingsDashboard({ id: 'user-1' } as never),
    ).resolves.toBe(response);
    expect(mockDashboardService.getSavingsDashboard).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('delegates savings history page retrieval with the current user id and query', async () => {
    const query = { page: 1, size: 10 };
    const response = {
      items: [],
      page: 1,
      size: 10,
      totalCount: 0,
      totalPages: 1,
    };
    mockDashboardService.getSavingsHistories.mockResolvedValue(response);

    await expect(
      controller.getSavingsHistories({ id: 'user-1' } as never, query),
    ).resolves.toBe(response);
    expect(mockDashboardService.getSavingsHistories).toHaveBeenCalledWith(
      'user-1',
      query,
    );
  });
});
