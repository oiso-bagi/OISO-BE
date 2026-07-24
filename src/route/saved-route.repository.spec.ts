import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SavedRouteRepository } from './saved-route.repository';

describe('SavedRouteRepository', () => {
  let repository: SavedRouteRepository;
  let prismaService: {
    savedRoute: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      savedRoute: {
        findMany: jest.fn(),
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

  it('calls prisma.savedRoute.findMany with userId filter if provided', async () => {
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

  it('calls prisma.savedRoute.findMany with empty where if userId is not provided', async () => {
    const mockList = [{ savedAt: new Date() }];
    prismaService.savedRoute.findMany.mockResolvedValue(mockList);

    const result: unknown = await repository.findListByUserId();

    expect(result).toBe(mockList);
    expect(prismaService.savedRoute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { savedAt: 'desc' },
      }),
    );
  });
});
