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
            getPlaceCollectionStatus: jest.fn(),
            triggerPlaceCollection: jest.fn(),
            getRelatedPlaceCollectionStatus: jest.fn(),
            triggerRelatedPlaceCollection: jest.fn(),
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

  it('GET /admin/kto/place-status 호출 시 service.getPlaceCollectionStatus를 호출해야 한다', async () => {
    const mockResult = {
      dailyApiUsage: 10,
      dailyQuotaLimit: 1000,
      lastCollectedAt: new Date(),
      status: 'IDLE' as const,
      totalPlaceCount: 150,
    };
    service.getPlaceCollectionStatus.mockResolvedValue(mockResult);

    const result = await controller.getPlaceStatus();
    expect(service.getPlaceCollectionStatus).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('POST /admin/kto/place-collect 호출 시 service.triggerPlaceCollection을 호출해야 한다', async () => {
    const mockResult = {
      message: '관광지 마스터 데이터 동기화가 성공적으로 완료되었습니다.',
      collectedAt: new Date(),
      updatedPlaceCount: 15,
      failureCount: 0,
      apiCallCount: 6,
    };
    service.triggerPlaceCollection.mockResolvedValue(mockResult);

    const result = await controller.triggerPlaceCollection();
    expect(service.triggerPlaceCollection).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('GET /admin/kto/related-status 호출 시 service.getRelatedPlaceCollectionStatus를 호출해야 한다', async () => {
    const mockResult = {
      dailyApiUsage: 1,
      dailyQuotaLimit: 1000,
      lastCollectedAt: new Date(),
      status: 'IDLE' as const,
      lastResult: 'SUCCESS' as const,
      lastMessage: '정상 완료',
      matchedPlaceCount: 45,
    };
    service.getRelatedPlaceCollectionStatus.mockResolvedValue(mockResult);

    const result = await controller.getRelatedStatus();
    expect(service.getRelatedPlaceCollectionStatus).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('POST /admin/kto/related-collect 호출 시 service.triggerRelatedPlaceCollection을 호출해야 한다', async () => {
    const mockResult = {
      message: '한국관광공사 연관관광지 수동 수집이 성공적으로 완료되었습니다.',
      collectedAt: new Date(),
      collectedCount: 50,
      matchedPlaceCount: 45,
      failureCount: 0,
      apiCallCount: 1,
    };
    service.triggerRelatedPlaceCollection.mockResolvedValue(mockResult);

    const result = await controller.triggerRelatedCollection();
    expect(service.triggerRelatedPlaceCollection).toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });
});
