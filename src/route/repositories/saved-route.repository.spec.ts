import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';

describe('SavedRouteRepository', () => {
  let repository: SavedRouteRepository;
  let prismaService: {
    savedRoute: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      deleteMany: jest.Mock;
    };
    route: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      savedRoute: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
      route: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
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

  it('calls prisma.savedRoute.deleteMany with userId and routeId', async () => {
    const mockResult = { count: 1 };
    prismaService.savedRoute.deleteMany.mockResolvedValue(mockResult);

    const result = await repository.deleteSavedRoute('user-1', 'route-1');

    expect(result).toBe(mockResult);
    expect(prismaService.savedRoute.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        routeId: 'route-1',
      },
    });
  });

  describe('upsertRouteTripCompletion', () => {
    it('returns null when saved route does not exist inside transaction', async () => {
      const mockTx = {
        savedRoute: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      prismaService.$transaction.mockImplementation(
        (cb: (tx: unknown) => unknown) => cb(mockTx),
      );

      const result = await repository.upsertRouteTripCompletion(
        'user-1',
        'route-1',
        true,
      );

      expect(result).toBeNull();
    });

    it('executes transaction with Serializable isolation level and creates record when not existing', async () => {
      const mockTrip = { id: 'trip-1', isCompleted: true };
      const mockTx = {
        savedRoute: {
          findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }),
        },
        routeTrip: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockTrip),
          update: jest.fn(),
        },
      };

      prismaService.$transaction.mockImplementation(
        (cb: (tx: unknown) => unknown) => cb(mockTx),
      );

      const result = await repository.upsertRouteTripCompletion(
        'user-1',
        'route-1',
        true,
        50000,
      );

      expect(prismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' },
      );
      expect(mockTx.routeTrip.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          routeId: 'route-1',
          isCompleted: true,
          startedAt: expect.any(Date) as Date,
          actualCostWon: 50000,
        },
      });
      expect(result).toEqual(mockTrip);
    });

    it('retries when Prisma P2034 serialization conflict error occurs', async () => {
      const mockTrip = { id: 'trip-1', isCompleted: true };
      const mockTx = {
        savedRoute: {
          findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }),
        },
        routeTrip: {
          findFirst: jest.fn().mockResolvedValue({ id: 'trip-1' }),
          update: jest.fn().mockResolvedValue(mockTrip),
        },
      };

      const p2034Error = new Prisma.PrismaClientKnownRequestError(
        'Serialization failure',
        { code: 'P2034', clientVersion: '5.22.0' },
      );

      let attempts = 0;
      prismaService.$transaction.mockImplementation(
        (cb: (tx: unknown) => unknown) => {
          attempts++;
          if (attempts === 1) {
            throw p2034Error;
          }
          return cb(mockTx);
        },
      );

      const result = await repository.upsertRouteTripCompletion(
        'user-1',
        'route-1',
        true,
      );

      expect(attempts).toBe(2);
      expect(result).toEqual(mockTrip);
    });
  });

  describe('ensureRouteExistsFromStitched', () => {
    it('creates stitched route with localContributionScore when not existing', async () => {
      prismaService.route.findUnique.mockResolvedValue(null);
      prismaService.route.create.mockResolvedValue({ id: 'stitched-1' });

      const result: string = await repository.ensureRouteExistsFromStitched(
        'stitched-1',
        {
          name: '통합 코스',
          totalDistanceMeters: 5000,
          estimatedSavingsWon: 2000,
          score: 4.5,
          localContributionScore: 70,
          stops: [
            {
              placeId: 'place-1',
              orderIndex: 0,
              dayNumber: 1,
            },
          ],
        },
      );

      expect(result).toBe('stitched-1');
      expect(prismaService.route.create).toHaveBeenCalledWith({
        data: {
          id: 'stitched-1',
          name: '통합 코스',
          region: '부산',
          estimatedCostWon: 0,
          estimatedDurationMin: 0,
          totalDistanceMeters: 5000,
          estimatedSavingsWon: 2000,
          localContributionScore: 70,
          score: expect.any(Prisma.Decimal) as Prisma.Decimal,
          routeType: 'RECOMMENDED',
          isPublished: true,
          stops: {
            create: [
              {
                orderIndex: 0,
                transitType: null,
                travelMinutesFromPrev: null,
                stayMinutes: null,
                fareWon: null,
                estimatedPriceWon: null,
                placeId: 'place-1',
                transitDetails: {
                  dayNumber: 1,
                  pathCoordinates: [],
                },
              },
            ],
          },
        },
        select: { id: true },
      });
    });

    it('returns existing id without creating when route already exists', async () => {
      prismaService.route.findUnique.mockResolvedValue({ id: 'stitched-1' });

      const result: string = await repository.ensureRouteExistsFromStitched(
        'stitched-1',
        {
          name: '통합 코스',
          totalDistanceMeters: 5000,
          estimatedSavingsWon: 2000,
          score: 4.5,
          stops: [],
        },
      );

      expect(result).toBe('stitched-1');
      expect(prismaService.route.create).not.toHaveBeenCalled();
    });
  });
});
