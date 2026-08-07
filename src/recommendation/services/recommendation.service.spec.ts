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

  it('allows total budget at the safe integer boundary', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([]);

    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: Number.MAX_SAFE_INTEGER,
      }),
    ).resolves.toEqual([]);

    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).toHaveBeenCalledWith({
      travelStyleSlugs: ['local-food'],
      durationDays: 1,
      dailyBudgetWon: Number.MAX_SAFE_INTEGER,
      totalBudgetWon: Number.MAX_SAFE_INTEGER,
    });
  });

  it('rejects recommendation request when total budget overflows the safe integer range', async () => {
    await expect(
      service.recommendRoutes({
        travelStyleSlugs: ['local-food'],
        durationDays: 2,
        dailyBudgetWon: Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.findRecommendedRoutes,
    ).not.toHaveBeenCalled();
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
      ratios: {
        foodRatio: 0.35,
        experienceRatio: 0.25,
        transportRatio: 0.4,
      },
    });
  });

  it('uses 10000m fallback distance for out-of-range coordinates, selecting fallback candidate over farther candidate and preferring closer valid candidate', async () => {
    mockRecommendationRepository.findRecommendedRoutes.mockResolvedValue([
      {
        id: 'route-day1',
        name: 'Day 1 Route',
        score: 95,
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
        score: 90,
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
        score: 85,
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
      {
        id: 'route-valid-near',
        name: 'Valid Near Route',
        score: 80,
        stops: [
          {
            orderIndex: 0,
            place: {
              id: 'p4',
              name: '유효하고 가까운 장소',
              latitude: 35.16,
              longitude: 129.12,
            }, // ~1.4km distance (<10000m)
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
    // Package 0 starts with route-day1. Day 2 picks route-valid-near (~1.4km < 10000m fallback).
    expect(results[0].stopLocations[1].placeName).toBe('유효하고 가까운 장소');

    // Package 2 starts with route-valid-far (~48km). Day 2 picks route-invalid-coord (10000m fallback < 48km Haversine distance).
    const packageStartingFar = results.find(
      (r) => r.stopLocations[0].placeName === '유효하지만 먼 장소',
    );
    expect(packageStartingFar).toBeDefined();
    expect(packageStartingFar!.stopLocations[1].placeName).toBe(
      '범주 초과 장소',
    );
  });
});
