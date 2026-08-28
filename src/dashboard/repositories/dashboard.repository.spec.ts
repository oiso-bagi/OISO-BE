import { Socket } from 'node:net';
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

describe('DashboardRepository PostgreSQL aggregations', () => {
  const targetUserId = 'dashboard-repository-target-user';
  const otherUserId = 'dashboard-repository-other-user';
  const userIds = [targetUserId, otherUserId];
  const routeIds = [
    'dashboard-repository-completed-route-a',
    'dashboard-repository-completed-route-b',
    'dashboard-repository-incomplete-route',
    'dashboard-repository-saved-only-route',
    'dashboard-repository-other-user-route',
  ];
  const placeIds = [
    'dashboard-repository-food-place',
    'dashboard-repository-cafe-place',
    'dashboard-repository-culture-place',
    'dashboard-repository-nature-place',
  ];
  const completedRouteAId = routeIds[0];
  const completedRouteBId = routeIds[1];
  const incompleteRouteId = routeIds[2];
  const savedOnlyRouteId = routeIds[3];
  const otherUserRouteId = routeIds[4];

  let prismaService: PrismaService;
  let repository: DashboardRepository;
  let isPostgresAvailable = false;

  beforeAll(async () => {
    if (!(await canConnectToDatabaseSocket())) {
      return;
    }

    prismaService = new PrismaService();
    try {
      await prismaService.$connect();
      await prismaService.$queryRaw`SELECT 1`;
      isPostgresAvailable = true;
      repository = new DashboardRepository(prismaService);
    } catch {
      isPostgresAvailable = false;
      await prismaService.$disconnect();
    }
  });

  beforeEach(async () => {
    if (!isPostgresAvailable) {
      return;
    }

    await cleanupDashboardAggregationData();
    await seedDashboardAggregationData();
  });

  afterEach(async () => {
    if (!isPostgresAvailable) {
      return;
    }

    await cleanupDashboardAggregationData();
  });

  afterAll(async () => {
    await prismaService?.$disconnect();
  });

  it('aggregates completed route trips without requiring saved route rows', async () => {
    if (!isPostgresAvailable) {
      return;
    }

    const result = await repository.findSavingsSummaryByUserId(targetUserId);

    expect(result).toEqual({
      tripCount: 2,
      totalSavingsWon: 15000,
      localContributionScore: 70,
    });
  });

  it('aggregates category savings from completed route trips only', async () => {
    if (!isPostgresAvailable) {
      return;
    }

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
          email: 'dashboard-repository-target@example.com',
          nickname: 'dashboard-repository-target',
        },
        {
          id: otherUserId,
          email: 'dashboard-repository-other@example.com',
          nickname: 'dashboard-repository-other',
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
          id: 'dashboard-repository-completed-trip-a',
          userId: targetUserId,
          routeId: completedRouteAId,
          isCompleted: true,
        },
        {
          id: 'dashboard-repository-completed-trip-b',
          userId: targetUserId,
          routeId: completedRouteBId,
          isCompleted: true,
        },
        {
          id: 'dashboard-repository-incomplete-trip',
          userId: targetUserId,
          routeId: incompleteRouteId,
          isCompleted: false,
        },
        {
          id: 'dashboard-repository-other-user-trip',
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
      where: {
        OR: [{ userId: { in: userIds } }, { routeId: { in: routeIds } }],
      },
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

  async function canConnectToDatabaseSocket(): Promise<boolean> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return false;
    }

    try {
      const { hostname, port } = new URL(databaseUrl);

      return await canOpenSocket(hostname, Number(port || 5432));
    } catch {
      return false;
    }
  }

  async function canOpenSocket(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new Socket();
      const done = (result: boolean) => {
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(1000);
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
      socket.once('timeout', () => done(false));
      socket.connect(port, host);
    });
  }
});
