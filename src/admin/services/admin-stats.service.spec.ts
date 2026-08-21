/* eslint-disable @typescript-eslint/unbound-method */
import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
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
            getSavingsBreakdown: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatsOverview', () => {
    it('통계 개요 정보를 정상 반환해야 한다', async () => {
      repository.getUserCount.mockResolvedValue(100);
      repository.getSavedRouteCount.mockResolvedValue(250);
      repository.getSavingsCostAndContribution.mockResolvedValue({
        totalSavingsCostWon: 50000,
        averageLocalContributionScore: 85.5,
      });

      const result = await service.getStatsOverview();

      expect(result.totalUserCount).toBe(100);
      expect(result.totalSavedRouteCount).toBe(250);
      expect(result.totalSavingsCostWon).toBe(50000);
      expect(result.averageLocalContributionScore).toBe(85.5);
    });
  });

  describe('getSavingsBreakdown', () => {
    it('카테고리 및 상권별 절약 지출액 분해 정보를 정상 반환해야 한다', async () => {
      (repository.getSavingsBreakdown as jest.Mock).mockResolvedValue({
        totalSavingsCostWon: 10000,
        breakdown: [
          { category: 'FOOD', label: '식당', amountWon: 6000, percentage: 60 },
          { category: 'CAFE', label: '카페', amountWon: 4000, percentage: 40 },
        ],
        regionBreakdown: [
          {
            region: '해운대구',
            label: '해운대구',
            amountWon: 10000,
            percentage: 100,
          },
        ],
      });

      const result = await service.getSavingsBreakdown();

      expect(result.totalSavingsCostWon).toBe(10000);
      expect(result.breakdown).toHaveLength(2);
      expect(result.regionBreakdown).toHaveLength(1);
    });
  });

  describe('triggerKtoCollection', () => {
    it('수동 수집 성공 시 결과를 반환해야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 50,
        failureCount: 0,
        apiCallCount: 50,
      });

      const result = await service.triggerKtoCollection();

      expect(result.updatedPlaceCount).toBe(50);
      expect(result.failureCount).toBe(0);
      expect(cronService.handleRouteCongestionUpdate).toHaveBeenCalled();
    });

    it('부분 성공 시 failureCount와 안내 메시지를 반환해야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 40,
        failureCount: 10,
        apiCallCount: 40,
      });

      const result = await service.triggerKtoCollection();

      expect(result.updatedPlaceCount).toBe(40);
      expect(result.failureCount).toBe(10);
      expect(result.message).toContain('부분 완료되었습니다');
    });

    it('전면 실패(updatedCount가 0이고 failureCount가 0 초과) 시 ServiceUnavailableException을 던지고 쿨타임을 적용하지 않아야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 0,
        failureCount: 5,
        apiCallCount: 5,
      });

      await expect(service.triggerKtoCollection()).rejects.toThrow(
        ServiceUnavailableException,
      );

      // 전면 실패 직후이므로 쿨타임 없이 바로 재시도 가능
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 5,
        failureCount: 0,
        apiCallCount: 5,
      });
      const retryResult = await service.triggerKtoCollection();
      expect(retryResult.updatedPlaceCount).toBe(5);
    });

    it('handleRouteCongestionUpdate 예외 발생 시 그대로 전파하고 쿨타임을 적용하지 않아야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockRejectedValue(
        new Error('KTO API network error'),
      );

      await expect(service.triggerKtoCollection()).rejects.toThrow(
        'KTO API network error',
      );

      // 네트워크 에러 직후이므로 쿨타임 없이 재시도 가능
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 10,
        failureCount: 0,
        apiCallCount: 10,
      });
      const retryResult = await service.triggerKtoCollection();
      expect(retryResult.updatedPlaceCount).toBe(10);
    });

    it('10분 쿨타임 이내 재요청 시 429 TOO_MANY_REQUESTS 예외를 던져야 한다', async () => {
      cronService.handleRouteCongestionUpdate.mockResolvedValue({
        updatedCount: 50,
        failureCount: 0,
        apiCallCount: 50,
      });

      await service.triggerKtoCollection();

      try {
        await service.triggerKtoCollection();
        fail('Should have thrown TOO_MANY_REQUESTS exception');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });
});
