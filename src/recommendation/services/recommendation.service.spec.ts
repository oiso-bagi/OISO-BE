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
      score: 4.5,
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
      score: 4.75,
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
      score: 4.25,
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
    expect(packageStartingInvalid!.stopLocations[1].placeName).toBe(
      '유효하지만 먼 장소',
    );
  });

  it('aggregates totalTimeMinutes across multi-day routes correctly in returned DTO', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'r1',
        name: 'Route 1',
        score: 4.5,
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
        score: 4.25,
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
        score: 4.5,
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

  it('preserves monotonicity for high raw scores (e.g. 4.88, 4.94, 5.0) without premature clamping', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'r-98',
        name: 'Route 98',
        score: 4.9,
        estimatedCostWon: 30000,
        themes: [{ theme: { slug: 'local-food' } }],
        stops: [],
      },
      {
        id: 'r-99',
        name: 'Route 99',
        score: 4.95,
        estimatedCostWon: 30000,
        themes: [{ theme: { slug: 'local-food' } }],
        stops: [],
      },
      {
        id: 'r-100',
        name: 'Route 100',
        score: 5.0,
        estimatedCostWon: 30000,
        themes: [{ theme: { slug: 'local-food' } }],
        stops: [],
      },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(3);
    const score100 = results.find((r) => r.id === 'r-100')?.score;
    const score99 = results.find((r) => r.id === 'r-99')?.score;
    const score98 = results.find((r) => r.id === 'r-98')?.score;

    expect(score100).toBeDefined();
    expect(score99).toBeDefined();
    expect(score98).toBeDefined();
    expect(score100!).toBeGreaterThan(score98!);
    expect(score100!).toBeGreaterThanOrEqual(score99!);
    expect(score99!).toBeGreaterThanOrEqual(score98!);
  });

  it('preserves score distinction under MAXIMUM bonus conditions (+0.85) without 100-point saturation', async () => {
    // Each route satisfies all bonus conditions perfectly (+0.85 total bonus)
    // 1) 2 themes matched (+0.45)
    // 2) 50% budget ratio (+0.15)
    // 3) LOW congestion (+0.10)
    // 4) 100 localContributionScore (+0.10)
    // 5) 300 min duration (+0.05)
    const baseCandidate = {
      estimatedCostWon: 30000,
      foodCostWon: 10500, // 35% (DEFAULT_RATIOS 일치)
      experienceCostWon: 7500, // 25% (DEFAULT_RATIOS 일치)
      transportCostWon: 12000, // 40% (DEFAULT_RATIOS 일치)
      congestionLevel: 'LOW' as const,
      localContributionScore: 100,
      estimatedDurationMin: 300,
      themes: [
        { theme: { slug: 'local-food' } },
        { theme: { slug: 'beach-tour' } },
      ],
      stops: [],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      { ...baseCandidate, id: 'r-max-98', name: 'Route 98', score: 4.8 },
      { ...baseCandidate, id: 'r-max-99', name: 'Route 99', score: 4.9 },
      { ...baseCandidate, id: 'r-max-100', name: 'Route 100', score: 5.0 },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food', 'beach-tour'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(3);
    const score100 = results.find((r) => r.id === 'r-max-100')?.score;
    const score99 = results.find((r) => r.id === 'r-max-99')?.score;
    const score98 = results.find((r) => r.id === 'r-max-98')?.score;

    expect(score100).toBe(100);
    expect(score99).toBe(99);
    expect(score98).toBe(98);
    expect(score100).toBeGreaterThan(score99!);
    expect(score99!).toBeGreaterThan(score98!);
  });

  it('preserves score distinction across the full seeded range below 3.8 (e.g. 3.5 vs 3.7)', async () => {
    const baseRoute = {
      estimatedCostWon: 30000,
      stops: [],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      { ...baseRoute, id: 'r-score-35', name: 'Route 3.5', score: 3.5 },
      { ...baseRoute, id: 'r-score-37', name: 'Route 3.7', score: 3.7 },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(2);
    const score35 = results.find((r) => r.id === 'r-score-35')?.score;
    const score37 = results.find((r) => r.id === 'r-score-37')?.score;

    expect(score35).toBeDefined();
    expect(score37).toBeDefined();
    expect(score37!).toBeGreaterThan(score35!);
  });

  it('guarantees score 6.0 is monotonically non-decreasing compared to score 5.0 without inversion', async () => {
    const baseRoute = {
      estimatedCostWon: 30000,
      stops: [],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      { ...baseRoute, id: 'r-score-5', name: 'Route 5.0', score: 5.0 },
      { ...baseRoute, id: 'r-score-6', name: 'Route 6.0', score: 6.0 },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    const score5 = results.find((r) => r.id === 'r-score-5')?.score;
    const score6 = results.find((r) => r.id === 'r-score-6')?.score;

    expect(score5).toBeDefined();
    expect(score6).toBeDefined();
    // 6.0 must be >= 5.0 and capped at max score (no boundary inversion)
    expect(score6!).toBeGreaterThanOrEqual(score5!);
  });

  it('breaks ties between candidates with identical base scores using primary theme, savings, and distance bonuses', async () => {
    const commonRoute = {
      score: 4.8,
      estimatedCostWon: 35000,
      foodCostWon: 12250,
      experienceCostWon: 8750,
      transportCostWon: 14000,
      congestionLevel: 'LOW' as const,
      localContributionScore: 90,
      estimatedDurationMin: 300,
      stops: [],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      // Route 1: Primary theme matches requested theme + high savings + sweetspot distance (highest tie-breaker)
      {
        ...commonRoute,
        id: 'r-primary-match',
        name: 'Primary Match Route',
        themes: [{ theme: { slug: 'local-food' } }],
        estimatedSavingsWon: 20000,
        totalDistanceMeters: 4000,
      },
      // Route 2: Secondary theme matches + moderate savings + longer distance
      {
        ...commonRoute,
        id: 'r-secondary-match',
        name: 'Secondary Match Route',
        themes: [
          { theme: { slug: 'traditional-market' } },
          { theme: { slug: 'local-food' } },
        ],
        estimatedSavingsWon: 12000,
        totalDistanceMeters: 4500,
      },
      // Route 3: Secondary theme matches + minimal savings + short distance
      {
        ...commonRoute,
        id: 'r-third-match',
        name: 'Third Route',
        themes: [
          { theme: { slug: 'traditional-market' } },
          { theme: { slug: 'local-food' } },
        ],
        estimatedSavingsWon: 1000,
        totalDistanceMeters: 1000,
      },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(3);
    const scorePrimary = results.find((r) => r.id === 'r-primary-match')?.score;
    const scoreSecondary = results.find(
      (r) => r.id === 'r-secondary-match',
    )?.score;
    const scoreThird = results.find((r) => r.id === 'r-third-match')?.score;

    expect(scorePrimary).toBeDefined();
    expect(scoreSecondary).toBeDefined();
    expect(scoreThird).toBeDefined();
    expect(scorePrimary!).toBeGreaterThan(scoreSecondary!);
    expect(scoreSecondary!).toBeGreaterThan(scoreThird!);
  });

  it('does not grant local-food primaryThemeBonus to a route whose first theme is traditional-market even if its name contains 맛집', async () => {
    const commonRoute = {
      score: 4.8,
      estimatedCostWon: 35000,
      foodCostWon: 12250,
      experienceCostWon: 8750,
      transportCostWon: 14000,
      congestionLevel: 'LOW' as const,
      localContributionScore: 90,
      estimatedDurationMin: 300,
      estimatedSavingsWon: 10000,
      totalDistanceMeters: 4000,
      stops: [],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      // Route A: 1st theme is local-food
      {
        ...commonRoute,
        id: 'r-pure-food',
        name: '부산 로컬 코스',
        themes: [{ theme: { slug: 'local-food' } }],
      },
      // Route B: 1st theme is traditional-market, but name contains '맛집'
      {
        ...commonRoute,
        id: 'r-market-with-food-name',
        name: '부산 전통 시장 - 맛집 골목 릴레이 코스',
        themes: [
          { theme: { slug: 'traditional-market' } },
          { theme: { slug: 'local-food' } },
        ],
      },
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(2);
    const scorePureFood = results.find((r) => r.id === 'r-pure-food')?.score;
    const scoreMarketNamedFood = results.find(
      (r) => r.id === 'r-market-with-food-name',
    )?.score;

    expect(scorePureFood).toBeDefined();
    expect(scoreMarketNamedFood).toBeDefined();
    // Pure food route must receive primaryThemeBonus and score strictly higher than market route
    expect(scorePureFood!).toBeGreaterThan(scoreMarketNamedFood!);
  });

  it('excludes single-day tiebreakers for multi-day requests (durationDays > 1) and preserves chaining ranking', async () => {
    const candidateA = {
      id: 'day1-cand',
      name: 'Day 1 Candidate',
      score: 4.8,
      estimatedCostWon: 25000,
      estimatedSavingsWon: 20000,
      totalDistanceMeters: 4000,
      themes: [{ theme: { slug: 'local-food' } }],
      stops: [
        {
          orderIndex: 0,
          place: { id: 'p1', latitude: 35.1, longitude: 129.1 },
        },
      ],
    };
    const candidateB = {
      id: 'day2-cand',
      name: 'Day 2 Candidate',
      score: 4.8,
      estimatedCostWon: 25000,
      estimatedSavingsWon: 1000,
      totalDistanceMeters: 1000,
      themes: [{ theme: { slug: 'beach-tour' } }],
      stops: [
        {
          orderIndex: 0,
          place: { id: 'p2', latitude: 35.105, longitude: 129.105 },
        },
      ],
    };

    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      candidateA,
      candidateB,
    ]);

    const results = await service.recommendRoutes({
      travelStyleSlugs: ['local-food', 'beach-tour'],
      durationDays: 2,
      dailyBudgetWon: 60000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].stopLocations).toHaveLength(2);
    // Package score must be computed using multi-day formula with chaining bonus (+1.0) without 1-day tie-breaker inflation
    expect(results[0].score).toBe(86);
  });
});
