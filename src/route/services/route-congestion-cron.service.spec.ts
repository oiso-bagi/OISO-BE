import { Test, TestingModule } from '@nestjs/testing';
import { CongestionLevel } from '@prisma/client';
import { RouteRepository } from '@/route/repositories/route.repository';
import { RouteCongestionCronService } from '@/route/services/route-congestion-cron.service';

describe('RouteCongestionCronService', () => {
  let service: RouteCongestionCronService;
  const routeRepositoryMock = {
    findPublishedRecommendedRouteCongestionTargets: jest.fn(),
    updateRouteCongestionLevel: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteCongestionCronService,
        { provide: RouteRepository, useValue: routeRepositoryMock },
      ],
    }).compile();

    service = module.get<RouteCongestionCronService>(
      RouteCongestionCronService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleRouteCongestionUpdate', () => {
    it('fetches active recommended routes and updates their congestionLevel passing region', async () => {
      const mockRoutes = [
        { id: 'route-1', name: '해운대 코스', region: '부산광역시 해운대구' },
        {
          id: 'route-2',
          name: '감천문화마을 코스',
          region: '부산광역시 사하구',
        },
      ];

      routeRepositoryMock.findPublishedRecommendedRouteCongestionTargets.mockResolvedValue(
        mockRoutes,
      );
      routeRepositoryMock.updateRouteCongestionLevel.mockResolvedValue({});
      const fetchSpy = jest
        .spyOn(service, 'fetchAndCalculateCongestion')
        .mockResolvedValue(CongestionLevel.MEDIUM);

      const result = await service.handleRouteCongestionUpdate();

      expect(
        routeRepositoryMock.findPublishedRecommendedRouteCongestionTargets,
      ).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'route-1',
        expect.any(String),
        '부산광역시 해운대구',
      );
      expect(
        routeRepositoryMock.updateRouteCongestionLevel,
      ).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ updatedCount: 2, failureCount: 0 });
    });

    it('contains failure when one route update fails and continues processing subsequent routes', async () => {
      const mockRoutes = [
        { id: 'route-fail', name: '실패 코스', region: '부산광역시' },
        { id: 'route-success', name: '성공 코스', region: '부산광역시' },
      ];

      routeRepositoryMock.findPublishedRecommendedRouteCongestionTargets.mockResolvedValue(
        mockRoutes,
      );
      routeRepositoryMock.updateRouteCongestionLevel
        .mockRejectedValueOnce(new Error('DB update failed'))
        .mockResolvedValueOnce({});
      jest
        .spyOn(service, 'fetchAndCalculateCongestion')
        .mockResolvedValue(CongestionLevel.LOW);

      const result = await service.handleRouteCongestionUpdate();

      expect(
        routeRepositoryMock.updateRouteCongestionLevel,
      ).toHaveBeenCalledTimes(2);
      expect(
        routeRepositoryMock.updateRouteCongestionLevel,
      ).toHaveBeenLastCalledWith('route-success', CongestionLevel.LOW);
      expect(result).toEqual({ updatedCount: 1, failureCount: 1 });
    });
  });

  describe('fetchAndCalculateCongestion', () => {
    it('returns a CongestionLevel enum value without API key', async () => {
      const level = await service.fetchAndCalculateCongestion('route-1', '');
      expect(Object.values(CongestionLevel)).toContain(level);
    });
  });
});
