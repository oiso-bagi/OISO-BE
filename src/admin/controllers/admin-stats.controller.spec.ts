/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsController } from '@/admin/controllers/admin-stats.controller';
import { AdminStatsService } from '@/admin/services/admin-stats.service';
import { AuthGuard } from '@/common/guards/auth.guard';

describe('AdminStatsController', () => {
  let controller: AdminStatsController;
  let service: jest.Mocked<AdminStatsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatsController],
      providers: [
        {
          provide: AdminStatsService,
          useValue: {
            getStatsOverview: jest.fn(),
            getSavingsBreakdown: jest.fn(),
            getKtoStatus: jest.fn(),
            triggerKtoCollection: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminStatsController>(AdminStatsController);
    service = module.get(AdminStatsService);
  });

  it('GET /admin/stats/overview 호출 시 service.getStatsOverview를 호출해야 한다', async () => {
    const mockResult = {
      totalUserCount: 10,
      totalSavedRouteCount: 20,
      totalSavingsCostWon: 30000,
      averageLocalContributionScore: 75.0,
    };
    service.getStatsOverview.mockResolvedValue(mockResult);

    const result = await controller.getStatsOverview();
    expect(service.getStatsOverview).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('GET /admin/stats/savings-breakdown 호출 시 service.getSavingsBreakdown을 호출해야 한다', async () => {
    const mockResult = {
      totalSavingsCostWon: 30000,
      breakdown: [],
    };
    service.getSavingsBreakdown.mockResolvedValue(mockResult);

    const result = await controller.getSavingsBreakdown();
    expect(service.getSavingsBreakdown).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('GET /admin/kto/status 호출 시 service.getKtoStatus를 호출해야 한다', async () => {
    const mockResult = {
      dailyApiUsage: 50,
      dailyQuotaLimit: 1000,
      lastCollectedAt: new Date(),
      status: 'IDLE' as const,
      targetPlaceCount: 50,
    };
    service.getKtoStatus.mockResolvedValue(mockResult);

    const result = await controller.getKtoStatus();
    expect(service.getKtoStatus).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('POST /admin/kto/collect 호출 시 service.triggerKtoCollection을 호출해야 한다', async () => {
    const mockResult = {
      message: '성공',
      collectedAt: new Date(),
      updatedPlaceCount: 50,
    };
    service.triggerKtoCollection.mockResolvedValue(mockResult);

    const result = await controller.triggerKtoCollection();
    expect(service.triggerKtoCollection).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });
});
