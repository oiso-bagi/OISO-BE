import { Test, TestingModule } from '@nestjs/testing';
import { CongestionLevel, RouteType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RouteRepository } from '@/route/repositories/route.repository';

describe('RouteRepository', () => {
  let repository: RouteRepository;
  let prismaService: {
    route: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      route: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<RouteRepository>(RouteRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('calls prisma.route.findListWithStops with RECOMMENDED routeType filter and returns result', async () => {
    const mockList = [{ id: 'route-1', name: '부산 야경 루트' }];
    prismaService.route.findMany.mockResolvedValue(mockList);

    const result: unknown = await repository.findListWithStops();

    expect(result).toBe(mockList);
    expect(prismaService.route.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { routeType: RouteType.RECOMMENDED, isPublished: true },
      }),
    );
  });

  it('calls prisma.route.findDetailWithStopsAndPlace with id and returns result', async () => {
    const mockDetail = { id: 'route-1', name: '부산 야경 루트' };
    prismaService.route.findUnique.mockResolvedValue(mockDetail);

    const result: unknown =
      await repository.findDetailWithStopsAndPlace('route-1');

    expect(result).toBe(mockDetail);
    expect(prismaService.route.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'route-1' },
      }),
    );
  });

  it('updates route congestion level by id', async () => {
    const updated = { id: 'route-1', congestionLevel: CongestionLevel.LOW };
    prismaService.route.update.mockResolvedValue(updated);

    await expect(
      repository.updateRouteCongestionLevel('route-1', CongestionLevel.LOW),
    ).resolves.toBe(updated);

    expect(prismaService.route.update).toHaveBeenCalledWith({
      where: { id: 'route-1' },
      data: { congestionLevel: CongestionLevel.LOW },
    });
  });
});
