import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let prismaService: {
    $queryRaw: jest.Mock;
    routeTrip: {
      findMany: jest.Mock;
    };
    savedRoute: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn(),
      routeTrip: {
        findMany: jest.fn(),
      },
      savedRoute: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<DashboardRepository>(DashboardRepository);
  });

  it('loads recent savings histories from completed route trips only', async () => {
    const completedTrips = [
      {
        id: 'trip-completed',
        startedAt: new Date('2026-08-01T00:00:00.000Z'),
        route: {
          id: 'route-completed',
          name: 'Completed route',
          estimatedSavingsWon: 10000,
        },
      },
    ];
    prismaService.routeTrip.findMany.mockResolvedValue(completedTrips);

    const result =
      await repository.findRecentCompletedSavingsTripsByUserId('user-1');

    expect(result).toBe(completedTrips);
    expect(prismaService.routeTrip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          isCompleted: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: 3,
      }),
    );
    expect(prismaService.savedRoute.findMany).not.toHaveBeenCalled();
  });

  it('summarizes savings from completed route trips without requiring saved route rows', async () => {
    prismaService.$queryRaw.mockResolvedValue([
      {
        tripCount: 1,
        totalSavingsWon: 10000,
        localContributionScore: 70,
      },
    ]);

    const result = await repository.findSavingsSummaryByUserId('user-1');

    expect(result).toEqual({
      tripCount: 1,
      totalSavingsWon: 10000,
      localContributionScore: 70,
    });
    expect(getLastRawQueryText()).toContain('FROM "RouteTrip" trip');
    expect(getLastRawQueryText()).toContain('trip."isCompleted" = true');
    expect(getLastRawQueryText()).not.toContain('"SavedRoute"');
  });

  it('summarizes category savings from completed route trips without requiring saved route rows', async () => {
    prismaService.$queryRaw.mockResolvedValue([
      {
        foodSavingsWon: 3000,
        transportSavingsWon: 1000,
        experienceSavingsWon: 6000,
      },
    ]);

    const result =
      await repository.findSavingsCategorySummaryByUserId('user-1');

    expect(result).toEqual({
      foodSavingsWon: 3000,
      transportSavingsWon: 1000,
      experienceSavingsWon: 6000,
    });
    expect(getLastRawQueryText()).toContain('FROM "RouteTrip" trip');
    expect(getLastRawQueryText()).toContain('trip."isCompleted" = true');
    expect(getLastRawQueryText()).not.toContain('"SavedRoute"');
  });

  function getLastRawQueryText(): string {
    const [strings] = prismaService.$queryRaw.mock.calls.at(-1) ?? [[]];

    return Array.isArray(strings) ? strings.join('') : String(strings);
  }
});
