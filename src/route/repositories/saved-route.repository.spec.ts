import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';

describe('SavedRouteRepository', () => {
  let repository: SavedRouteRepository;
  let prismaService: {
    savedRoute: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      savedRoute: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedRouteRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<SavedRouteRepository>(SavedRouteRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('calls prisma.savedRoute.findMany with userId filter', async () => {
    const mockList = [{ savedAt: new Date() }];
    prismaService.savedRoute.findMany.mockResolvedValue(mockList);

    const result: unknown = await repository.findListByUserId('user-1');

    expect(result).toBe(mockList);
    expect(prismaService.savedRoute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { savedAt: 'desc' },
      }),
    );
  });

  it('calls prisma.savedRoute.findFirst with routeId and userId', async () => {
    const mockDetail = { savedAt: new Date() };
    prismaService.savedRoute.findFirst.mockResolvedValue(mockDetail);

    const result: unknown = await repository.findDetailByRouteId(
      'route-1',
      'user-1',
    );

    expect(result).toBe(mockDetail);
    expect(prismaService.savedRoute.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { routeId: 'route-1', userId: 'user-1' },
      }),
    );
  });
});
