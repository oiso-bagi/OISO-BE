/* eslint-disable @typescript-eslint/unbound-method */
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsRepository } from '@/admin/repositories/admin-stats.repository';
import { AdminStatsService } from '@/admin/services/admin-stats.service';
import { RouteCongestionCronService } from '@/route/services/route-congestion-cron.service';

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let repository: jest.Mocked<AdminStatsRepository>;
  let cronService: jest.Mocked<RouteCongestionCronService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        {
          provide: AdminStatsRepository,
          useValue: {
            getUserCount: jest.fn(),
            getSavedRouteCount: jest.fn(),
            getSavingsCostAndContribution: jest.fn(),
            getSavingsBreakdownByCategory: jest.fn(),
            getTargetPlaceCount: jest.fn(),
          },
        },
        {
          provide: RouteCongestionCronService,
          useValue: {
            handleRouteCongestionUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminStatsService>(AdminStatsService);
    repository = module.get(AdminStatsRepository);
    cronService = module.get(RouteCongestionCronService);
  });

  describe('getStatsOverview', () => {
    it('대시보드 KPI 카드 4종 통계를 성공적으로 집계해야 한다', async () => {
      repository.getUserCount.mockResolvedValue(100);
      repository.getSavedRouteCount.mockResolvedValue(250);
      repository.getSavingsCostAndContribution.mockResolvedValue({
        totalSavingsCostWon: 1500000,
        averageLocalContributionScore: 82.5,
      });

      const result = await service.getStatsOverview();

      expect(result.totalUserCount).toBe(100);
      expect(result.totalSavedRouteCount).toBe(250);
      expect(result.totalSavingsCostWon).toBe(1500000);
      expect(result.averageLocalContributionScore).toBe(82.5);
    });
  });

  describe('getSavingsBreakdown', () => {
    it('카테고리별 절약 요약을 성공적으로 반환해야 한다', async () => {
      repository.getSavingsBreakdownByCategory.mockResolvedValue({
        totalSavingsCostWon: 10000,
        breakdown: [
          { category: 'FOOD', label: '식당', amountWon: 6000, percentage: 60 },
          { category: 'CAFE', label: '카페', amountWon: 4000, percentage: 40 },
        ],
      });

      const result = await service.getSavingsBreakdown();

      expect(result.totalSavingsCostWon).toBe(10000);
      expect(result.breakdown).toHaveLength(2);
    });
  });

  describe('triggerKtoCollection', () => {
    it('수동 수집 성공 시 결과를 반환해야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 50,
        failureCount: 0,
      });

      const result = await service.triggerKtoCollection();

      expect(result.updatedPlaceCount).toBe(50);
      expect(cronService.handleRouteCongestionUpdate).toHaveBeenCalled();
    });

    it('10분 쿨타임 이내 재요청 시 429 Too Many Requests 예외를 던져야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 50,
        failureCount: 0,
      });

      await service.triggerKtoCollection();

      await expect(service.triggerKtoCollection()).rejects.toThrow(
        HttpException,
      );
    });
  });
});
