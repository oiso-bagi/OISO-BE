import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RouteRepository } from './route.repository';

describe('RouteRepository', () => {
  let repository: RouteRepository;
  let prismaService: {
    route: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      route: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
    const mockList = [{ id: 'route-1', name: '부산 힐링 루트' }];
    prismaService.route.findMany.mockResolvedValue(mockList);

    const result: unknown = await repository.findListWithStops();

    expect(result).toBe(mockList);
    expect(prismaService.route.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { routeType: 'RECOMMENDED', isPublished: true },
      }),
    );
  });

  it('calls prisma.route.findDetailWithStopsAndPlace with id and returns result', async () => {
    const mockDetail = { id: 'route-1', name: '부산 힐링 루트' };
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
});
