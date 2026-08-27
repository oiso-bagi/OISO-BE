import { BadRequestException } from '@nestjs/common';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';
import { RecommendationService } from '@/recommendation/services/recommendation.service';

describe('RecommendationService', () => {
  const mockRecommendationRepository = {
    findRecommendedRoutes: jest.fn(),
  };

  let service: RecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecommendationService(
      mockRecommendationRepository as unknown as RecommendationRepository,
    );
  });

  it('returns recommendation options for onboarding screens', () => {
    const result = service.getOptions();

    expect(result.durationDays).toEqual([1, 2, 3, 4, 5]);
    expect(result.budgetAllocation.defaultDailyBudgetWon).toBe(60000);
    expect(result.travelStyles.map((travelStyle) => travelStyle.slug)).toEqual([
      'local-food',
      'emotion-cafe',
      'beach-tour',
      'photo-spot',
      'traditional-market',
      'nature-walk',
    ]);
  });

  it('returns recommended routes from a raw request body without storing preferences', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'route-1',
        name: 'Budget route',
        totalDistanceMeters: 1200,
        estimatedSavingsWon: 5000,
        score: 4.5,
        routeType: 'RECOMMENDED',
        congestionLevel: 'LOW',
        stops: [],
      },
    ]);

    const result = await service.recommendRoutes({
      travelStyleSlugs: ['local-food', 'emotion-cafe', 'local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).toHaveBeenCalledWith({
      travelStyleSlugs: ['local-food', 'emotion-cafe'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      totalBudgetWon: 60000,
      isPedestrianMode: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'route-1',
      name: 'Budget route',
      estimatedSavingsWon: 5000,
      isRecommended: true,
    });
  });

  it('rejects recommendation request when travel styles are empty', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: [],
        durationDays: 1,
        dailyBudgetWon: 60000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['numeric element', ['local-food', 1]],
    ['object element', ['local-food', {}]],
  ])(
    'rejects recommendation request when travel styles contain a %s',
    async (_caseName, travelStyleSlugs) => {
      await expect(
        service.recommendRoutes({
          travelStyleSlugs,
          durationDays: 1,
          dailyBudgetWon: 60000,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(
        mockRecommendationRepository.findRecommendedRoutes,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects recommendation request when duration days are out of range', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 6,
        dailyBudgetWon: 60000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects recommendation request when daily budget is invalid', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects recommendation request when daily budget exceeds the safe integer range', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).not.toHaveBeenCalled();
  });

  it('rejects recommendation request when total budget is below the minimum (9,999 won)', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 9999,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).not.toHaveBeenCalled();
  });

  it('rejects recommendation request when total budget exceeds the maximum (500,001 won total)', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 5,
        dailyBudgetWon: 100001,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).not.toHaveBeenCalled();
  });

  it('accepts recommendation request at the boundary total budget values (10,000 and 500,000 won)', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([]);

    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 10000,
      }),
    ).resolves.toEqual([]);

    await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 5,
      dailyBudgetWon: 100000,
    });

    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        durationDays: 5,
        dailyBudgetWon: 100000,
        totalBudgetWon: 500000,
      }),
    );
  });

  it('rejects recommendation request when total budget overflows safe integer range', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 5,
        dailyBudgetWon: Math.floor(Number.MAX_SAFE_INTEGER / 5) + 1,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).not.toHaveBeenCalled();
  });

  it('skips expensive candidates during multi-day chaining and selects valid cheaper alternatives within total budget', async () => {
    const day1Route = {
      id: 'day1-route',
      name: 'Day 1',
      score: 90,
      estimatedCostWon: 40000,
      routeType: 'RECOMMENDED',
      congestionLevel: 'MEDIUM',
      stops: [
        {
          orderIndex: 0,
          place: {
            id: 'p1',
            name: 'Place 1',
            category: 'FOOD',
            latitude: 35.1,
            longitude: 129.1,
          },
        },
      ],
    };
    const expensiveDay2Route = {
      id: 'expensive-day2',
      name: 'Expensive Day 2',
      score: 95,
      estimatedCostWon: 30000, // 40000 + 30000 = 70000 > 60000 total budget
      routeType: 'RECOMMENDED',
      congestionLevel: 'MEDIUM',
      stops: [
        {
          orderIndex: 0,
          place: {
            id: 'p2',
            name: 'Place 2',
            category: 'FOOD',
            latitude: 35.101,
            longitude: 129.101,
          },
        },
      ],
    };
    const cheaperDay2Route = {
      id: 'cheaper-day2',
      name: 'Cheaper Day 2',
      score: 85,
      estimatedCostWon: 15000, // 40000 + 15000 = 55000 <= 60000 total budget
      routeType: 'RECOMMENDED',
      congestionLevel: 'MEDIUM',
      stops: [
        {
          orderIndex: 0,
          place: {
            id: 'p3',
            name: 'Place 3',
            category: 'FOOD',
            latitude: 35.105,
            longitude: 129.105,
          },
        },
      ],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      day1Route,
      expensiveDay2Route,
      cheaperDay2Route,
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 2,
      dailyBudgetWon: 30000, // totalBudgetWon = 60,000
    });

    expect(results.length).toBeGreaterThan(0);
    const day1Result = results.find((r) => r.name.includes('Day 1'));
    expect(day1Result).toBeDefined();
    const placeNames = (day1Result?.stopLocations || []).map(
      (s) => s.placeName,
    );
    expect(placeNames).toContain('Place 3');
    expect(placeNames).not.toContain('Place 2');
  });

  it('supports fully provided, partially provided, and wholly missing ratios', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([]);

    // 1) wholly missing ratios
    await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    // 2) fully provided ratios
    await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      ratios: {
        foodRatio: 0.4,
        experienceRatio: 0.3,
        transportRatio: 0.3,
      },
    });

    // 3) partially provided ratios (missing transportRatio defaults to 0.40)
    await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      ratios: {
        foodRatio: 0.35,
        experienceRatio: 0.25,
      },
    });

    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).toHaveBeenCalledTimes(3);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).toHaveBeenNthCalledWith(3, {
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      totalBudgetWon: 60000,
      isPedestrianMode: undefined,
      ratios: {
        foodRatio: 0.35,
        experienceRatio: 0.25,
        transportRatio: 0.4,
      },
    });
  });

  it('uses 10000m fallback distance for out-of-range coordinates, selecting fallback candidate over farther candidate', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'route-day1',
        name: 'Day 1 Route',
        score: 4.5,
        themes: [],
        estimatedCostWon: 20000,
        stops: [
          {
            orderIndex: 0,
            place: {
              id: 'p1',
              name: '출발 장소',
              latitude: 35.15,
              longitude: 129.11,
            },
          },
        ],
      },
      {
        id: 'route-invalid-coord',
        name: 'Invalid Coord Route',
        score: 4.2,
        themes: [],
        estimatedCostWon: 20000,
        stops: [
          {
            orderIndex: 0,
            place: {
              id: 'p2',
              name: '범주 초과 장소',
              latitude: 95,
              longitude: 129.11,
            }, // lat 95 (out of range -> 10000m fallback)
          },
        ],
      },
      {
        id: 'route-valid-far',
        name: 'Valid Far Route',
        score: 4.0,
        themes: [],
        estimatedCostWon: 20000,
        stops: [
          {
            orderIndex: 0,
            place: {
              id: 'p3',
              name: '유효하지만 먼 장소',
              latitude: 35.5,
              longitude: 129.5,
            }, // ~48km distance (>10000m)
          },
        ],
      },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 2,
      dailyBudgetWon: 60000,
    });

    expect(results.length).toBeGreaterThan(0);

    // 1번째 패키지: route-day1 시작. 2일차는 가장 가까운 route-invalid-coord (10000m fallback < ~48km)
    const packageStartingDay1 = results.find(
      (r) => r.stopLocations[0].placeName === '출발 장소',
    );
    expect(packageStartingDay1).toBeDefined();
    expect(packageStartingDay1!.stopLocations[1].placeName).toBe(
      '범주 초과 장소',
    );

    // 2번째 패키지: route-invalid-coord 시작. 2일차는 route-valid-far (~48km) vs route-day1(usedPenalty) 중 선택.
    // 두 후보 모두 usedRoutePenalty 20000m가 부과되므로 closest 거리로 선택됨.
    const packageStartingInvalid = results.find(
      (r) => r.stopLocations[0].placeName === '범주 초과 장소',
    );
    expect(packageStartingInvalid).toBeDefined();
  });

  it('aggregates totalTimeMinutes across multi-day routes correctly in returned DTO', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'r1',
        name: 'Route 1',
        score: 90,
        estimatedDurationMin: 180,
        stops: [
          {
            orderIndex: 0,
            travelMinutesFromPrev: 30,
            stayMinutes: 150,
            place: { id: 'p1', latitude: 35.1, longitude: 129.1 },
          },
        ],
      },
      {
        id: 'r2',
        name: 'Route 2',
        score: 85,
        estimatedDurationMin: 240,
        stops: [
          {
            orderIndex: 0,
            travelMinutesFromPrev: 60,
            stayMinutes: 180,
            place: { id: 'p2', latitude: 35.11, longitude: 129.11 },
          },
        ],
      },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 2,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(2);
    // Day 1: (30+150=180) + Day 2: (60+180=240) = 420 minutes total
    expect(results[0].totalTimeMinutes).toBe(420);
  });

  it('assembles multi-day package successfully using soft penalty route reuse when candidates are fewer than requested duration', async () => {
    // Only 1 candidate available for a 3-day request
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'single-route',
        name: 'Single Available Route',
        score: 90,
        stops: [
          {
            orderIndex: 0,
            place: { id: 'p-single', latitude: 35.15, longitude: 129.11 },
          },
        ],
      },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 3,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].stopLocations).toHaveLength(3);
    expect(results[0].stopLocations[0].dayNumber).toBe(1);
    expect(results[0].stopLocations[1].dayNumber).toBe(2);
    expect(results[0].stopLocations[2].dayNumber).toBe(3);
  });
});
