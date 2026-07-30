import { Test, TestingModule } from '@nestjs/testing';
import { RouteCongestionCronService } from './route-congestion-cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CongestionLevel, RouteType } from '@prisma/client';

describe('RouteCongestionCronService', () => {
  let service: RouteCongestionCronService;
  const prismaMock = {
    route: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.route.findMany.mockReset();
    prismaMock.route.update.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteCongestionCronService,
        { provide: PrismaService, useValue: prismaMock },
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

      prismaMock.route.findMany.mockResolvedValue(mockRoutes);
      prismaMock.route.update.mockResolvedValue({});
      const fetchSpy = jest
        .spyOn(service, 'fetchAndCalculateCongestion')
        .mockResolvedValue(CongestionLevel.MEDIUM);

      await service.handleRouteCongestionUpdate();

      expect(prismaMock.route.findMany).toHaveBeenCalledWith({
        where: { routeType: RouteType.RECOMMENDED, isPublished: true },
        select: { id: true, name: true, region: true },
      });
      // 동일한 지역 키(areaCd, signguCd)에 대해 1회만 fetch하고 캐시된 결과를 재사용함
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'route-1',
        expect.any(String),
        '부산광역시 해운대구',
      );
      expect(prismaMock.route.update).toHaveBeenCalledTimes(2);
    });

    it('contains failure when one route update fails and continues processing subsequent routes', async () => {
      const mockRoutes = [
        { id: 'route-fail', name: '실패 코스', region: '부산광역시' },
        { id: 'route-success', name: '성공 코스', region: '부산광역시' },
      ];

      prismaMock.route.findMany.mockResolvedValue(mockRoutes);
      prismaMock.route.update
        .mockRejectedValueOnce(new Error('DB update failed'))
        .mockResolvedValueOnce({});
      jest
        .spyOn(service, 'fetchAndCalculateCongestion')
        .mockResolvedValue(CongestionLevel.LOW);

      await service.handleRouteCongestionUpdate();

      expect(prismaMock.route.update).toHaveBeenCalledTimes(2);
      expect(prismaMock.route.update).toHaveBeenLastCalledWith({
        where: { id: 'route-success' },
        data: { congestionLevel: CongestionLevel.LOW },
      });
    });
  });

  describe('fetchAndCalculateCongestion', () => {
    it('returns a CongestionLevel enum value without API key', async () => {
      const level = await service.fetchAndCalculateCongestion('route-1', '');
      expect(Object.values(CongestionLevel)).toContain(level);
    });
  });
});
