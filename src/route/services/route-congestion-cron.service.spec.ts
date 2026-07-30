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
    it('fetches active recommended routes and updates their congestionLevel', async () => {
      const mockRoutes = [
        { id: 'route-1', name: '해운대 코스' },
        { id: 'route-2', name: '감천문화마을 코스' },
      ];

      prismaMock.route.findMany.mockResolvedValue(mockRoutes);
      prismaMock.route.update.mockResolvedValue({});
      jest
        .spyOn(service, 'fetchAndCalculateCongestion')
        .mockResolvedValue(CongestionLevel.MEDIUM);

      await service.handleRouteCongestionUpdate();

      expect(prismaMock.route.findMany).toHaveBeenCalledWith({
        where: { routeType: RouteType.RECOMMENDED, isPublished: true },
        select: { id: true, name: true, region: true },
      });
      expect(prismaMock.route.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchAndCalculateCongestion', () => {
    it('returns a CongestionLevel enum value without API key', async () => {
      const level = await service.fetchAndCalculateCongestion('route-1', '');
      expect(Object.values(CongestionLevel)).toContain(level);
    });
  });
});
