import { BadRequestException } from '@nestjs/common';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';
import { DashboardService } from '@/dashboard/services/dashboard.service';

describe('DashboardService', () => {
  const mockDashboardRepository = {
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
    mockDashboardRepository.findCompletedSavingsTripsByUserId.mockResolvedValue(
      [],
    );

    const result = await service.getSavingsDashboard(' user-1 ');

    expect(
      mockDashboardRepository.findCompletedSavingsTripsByUserId,
    ).toHaveBeenCalledWith('user-1');
    expect(result.totalSavingsWon).toBe(0);
  });

  it('rejects an empty user id', async () => {
    await expect(service.getSavingsDashboard(' ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      mockDashboardRepository.findCompletedSavingsTripsByUserId,
    ).not.toHaveBeenCalled();
  });
});
