import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaceCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';

type QueryRawFn = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>;
type QueryRawMock = jest.Mock<ReturnType<QueryRawFn>, Parameters<QueryRawFn>>;

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let prismaService: {
    $queryRaw: QueryRawMock;
    routeTrip: {
      findMany: jest.Mock;
    };
    savedRoute: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn<ReturnType<QueryRawFn>, Parameters<QueryRawFn>>(),
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
    const calls: unknown[] = prismaService.$queryRaw.mock.calls;
    const lastCall = calls.at(-1);
    const callArgs: unknown[] = Array.isArray(lastCall) ? lastCall : [];
    const [strings] = callArgs;

    return isStringArray(strings) ? strings.join('') : '';
  }

  function isStringArray(value: unknown): value is string[] {
    return (
      Array.isArray(value) && value.every((item) => typeof item === 'string')
    );
  }
});

const describePostgresAggregations =
  process.env.SKIP_DASHBOARD_REPOSITORY_INTEGRATION_TESTS === 'true'
    ? describe.skip
    : describe;

describePostgresAggregations(
  'DashboardRepository PostgreSQL aggregations',
  () => {
    const testRunId = `dashboard-repository-${randomUUID()}`;
    const targetUserId = `${testRunId}-target-user`;
    const otherUserId = `${testRunId}-other-user`;
    const userIds = [targetUserId, otherUserId];
    const routeIds = [
      `${testRunId}-completed-route-a`,
      `${testRunId}-completed-route-b`,
      `${testRunId}-incomplete-route`,
      `${testRunId}-saved-only-route`,
      `${testRunId}-other-user-route`,
    ];
    const placeIds = [
      `${testRunId}-food-place`,
      `${testRunId}-cafe-place`,
      `${testRunId}-culture-place`,
      `${testRunId}-nature-place`,
    ];
    const routeTripIds = [
      `${testRunId}-completed-trip-a`,
      `${testRunId}-completed-trip-b`,
      `${testRunId}-incomplete-trip`,
      `${testRunId}-other-user-trip`,
    ];
    const completedRouteAId = routeIds[0];
    const completedRouteBId = routeIds[1];
    const incompleteRouteId = routeIds[2];
    const savedOnlyRouteId = routeIds[3];
    const otherUserRouteId = routeIds[4];

    let prismaService: PrismaService;
    let repository: DashboardRepository;

    beforeAll(async () => {
      assertDedicatedTestDatabase();
      prismaService = new PrismaService();
      await prismaService.$connect();
      await prismaService.$queryRaw`SELECT 1`;
      repository = new DashboardRepository(prismaService);
    });

    beforeEach(async () => {
      await cleanupDashboardAggregationData();
      await seedDashboardAggregationData();
    });

    afterEach(async () => {
      if (!prismaService) {
        return;
      }

      await cleanupDashboardAggregationData();
    });

    afterAll(async () => {
      await prismaService?.$disconnect();
    });

    it('aggregates completed route trips without requiring saved route rows', async () => {
      const result = await repository.findSavingsSummaryByUserId(targetUserId);

      expect(result).toEqual({
        tripCount: 2,
        totalSavingsWon: 15000,
        localContributionScore: 70,
      });
    });

    it('aggregates category savings from completed route trips only', async () => {
      const result =
        await repository.findSavingsCategorySummaryByUserId(targetUserId);

      expect(result).toEqual({
        foodSavingsWon: 5000,
        transportSavingsWon: 2000,
        experienceSavingsWon: 10000,
      });
    });

    async function seedDashboardAggregationData() {
      await prismaService.user.createMany({
        data: [
          {
            id: targetUserId,
            email: `${testRunId}-target@example.com`,
            nickname: `${testRunId}-target`,
          },
          {
            id: otherUserId,
            email: `${testRunId}-other@example.com`,
            nickname: `${testRunId}-other`,
          },
        ],
      });

      await prismaService.place.createMany({
        data: [
          {
            id: placeIds[0],
            name: 'Dashboard repository food place',
            region: 'Busan',
            category: PlaceCategory.FOOD,
          },
          {
            id: placeIds[1],
            name: 'Dashboard repository cafe place',
            region: 'Busan',
            category: PlaceCategory.CAFE,
          },
          {
            id: placeIds[2],
            name: 'Dashboard repository culture place',
            region: 'Busan',
            category: PlaceCategory.CULTURE,
          },
          {
            id: placeIds[3],
            name: 'Dashboard repository nature place',
            region: 'Busan',
            category: PlaceCategory.NATURE,
          },
        ],
      });

      await prismaService.route.createMany({
        data: [
          createRouteData(completedRouteAId, 10000, 80),
          createRouteData(completedRouteBId, 5000, 60),
          createRouteData(incompleteRouteId, 99999, 100),
          createRouteData(savedOnlyRouteId, 88888, 100),
          createRouteData(otherUserRouteId, 77777, 100),
        ],
      });

      await prismaService.routeStop.createMany({
        data: [
          createRouteStopData(completedRouteAId, placeIds[0], 0, 3000, 500),
          createRouteStopData(completedRouteAId, placeIds[2], 1, 6000, 700),
          createRouteStopData(completedRouteBId, placeIds[1], 0, 2000, 300),
          createRouteStopData(completedRouteBId, placeIds[3], 1, 4000, 500),
          createRouteStopData(incompleteRouteId, placeIds[0], 0, 99999, 99999),
          createRouteStopData(savedOnlyRouteId, placeIds[2], 0, 88888, 88888),
          createRouteStopData(otherUserRouteId, placeIds[3], 0, 77777, 77777),
        ],
      });

      await prismaService.routeTrip.createMany({
        data: [
          {
            id: routeTripIds[0],
            userId: targetUserId,
            routeId: completedRouteAId,
            isCompleted: true,
          },
          {
            id: routeTripIds[1],
            userId: targetUserId,
            routeId: completedRouteBId,
            isCompleted: true,
          },
          {
            id: routeTripIds[2],
            userId: targetUserId,
            routeId: incompleteRouteId,
            isCompleted: false,
          },
          {
            id: routeTripIds[3],
            userId: otherUserId,
            routeId: otherUserRouteId,
            isCompleted: true,
          },
        ],
      });

      await prismaService.savedRoute.create({
        data: {
          userId: targetUserId,
          routeId: savedOnlyRouteId,
        },
      });
    }

    async function cleanupDashboardAggregationData() {
      await prismaService.routeTrip.deleteMany({
        where: { id: { in: routeTripIds } },
      });
      await prismaService.savedRoute.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { routeId: { in: routeIds } }],
        },
      });
      await prismaService.routeStop.deleteMany({
        where: {
          OR: [{ routeId: { in: routeIds } }, { placeId: { in: placeIds } }],
        },
      });
      await prismaService.route.deleteMany({
        where: { id: { in: routeIds } },
      });
      await prismaService.place.deleteMany({
        where: { id: { in: placeIds } },
      });
      await prismaService.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    function createRouteData(
      id: string,
      estimatedSavingsWon: number,
      localContributionScore: number,
    ) {
      return {
        id,
        name: id,
        region: 'Busan',
        estimatedCostWon: 30000,
        estimatedDurationMin: 120,
        totalDistanceMeters: 5000,
        estimatedSavingsWon,
        localContributionScore,
      };
    }

    function createRouteStopData(
      routeId: string,
      placeId: string,
      orderIndex: number,
      savingsWon: number,
      fareWon: number,
    ) {
      return {
        id: `${routeId}-stop-${orderIndex}`,
        routeId,
        placeId,
        orderIndex,
        savingsWon,
        fareWon,
      };
    }

    function assertDedicatedTestDatabase() {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        throw new Error(
          'DATABASE_URL is required for DashboardRepository PostgreSQL aggregation tests. Set SKIP_DASHBOARD_REPOSITORY_INTEGRATION_TESTS=true to skip locally.',
        );
      }

      let databaseName: string;

      try {
        databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
      } catch {
        throw new Error(
          'DATABASE_URL must point to a dedicated test database for DashboardRepository PostgreSQL aggregation tests.',
        );
      }

      if (!databaseName.includes('test')) {
        throw new Error(
          `Refusing to run DashboardRepository integration tests against non-test database "${databaseName}".`,
        );
      }
    }
  },
);
