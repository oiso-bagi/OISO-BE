import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RouteRepository } from '@/route/repositories/route.repository';
import { RouteService } from '@/route/services/route.service';

describe('RouteService', () => {
  let service: RouteService;
  const mockRouteRepository = {
    findDetailWithStopsAndPlace: jest.fn(),
    findListWithStops: jest.fn(),
    findRecommendedCandidates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: RouteRepository, useValue: mockRouteRepository },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('maps repository list items to RecommendedRouteListResponseDto', async () => {
    mockRouteRepository.findListWithStops.mockResolvedValue([
      {
        id: 'route-1',
        name: '부산 야경 루트',
        totalDistanceMeters: 3200,
        estimatedSavingsWon: 1000,
        score: 4.7,
        routeType: 'RECOMMENDED',
        stops: [
          {
            orderIndex: 0,
            transitType: 'BUS',
            travelMinutesFromPrev: 20,
            stayMinutes: 10,
            fareWon: 1500,
            estimatedPriceWon: 9000,
            place: null,
          },
          {
            orderIndex: 1,
            transitType: 'BUS',
            travelMinutesFromPrev: 30,
            stayMinutes: 20,
            fareWon: 500,
            estimatedPriceWon: 1500,
            place: null,
          },
        ],
      },
    ]);

    const result = await service.getRecommendedRouteList();

    expect(mockRouteRepository.findListWithStops).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'route-1',
        name: '부산 야경 루트',
        stopCount: 2,
        totalDistanceMeters: 3200,
        totalDistanceKm: 3.2,
        transitTypes: ['BUS'],
        totalCost: 12500,
        totalTimeMinutes: 80,
        congestionLevel: 'MEDIUM',
        estimatedSavingsWon: 1000,
        score: 4.7,
        isRecommended: true,
        stopLocations: [
          {
            sequence: 0,
            placeName: '',
            latitude: null,
            longitude: null,
          },
          {
            sequence: 1,
            placeName: '',
            latitude: null,
            longitude: null,
          },
        ],
      },
    ]);
    expect(result[0]).not.toHaveProperty('stops');
  });

  it('throws NotFoundException when recommended route detail is not found', async () => {
    mockRouteRepository.findDetailWithStopsAndPlace.mockResolvedValue(null);

    await expect(
      service.getRecommendedRouteDetail(' route-missing '),
    ).rejects.toThrow(NotFoundException);

    expect(
      mockRouteRepository.findDetailWithStopsAndPlace,
    ).toHaveBeenCalledWith('route-missing');
  });

  it('returns top 3 budget based recommendations ordered by calculated score', async () => {
    mockRouteRepository.findRecommendedCandidates.mockResolvedValue([
      createBudgetCandidate('route-low', 30),
      createBudgetCandidate('route-high', 90),
      createBudgetCandidate('route-mid', 60),
      createBudgetCandidate('route-extra', 20),
    ]);

    const result = await service.getBudgetRecommendedRoutes({
      budget: 100000,
      ratios: {
        foodRatio: 0.4,
        experienceRatio: 0.4,
        transportRatio: 0.2,
      },
      themeSlugs: [' local-food ', 'local-food'],
    });

    expect(mockRouteRepository.findRecommendedCandidates).toHaveBeenCalledWith(
      100000,
      ['local-food'],
    );
    expect(result.map((route) => route.id)).toEqual([
      'route-high',
      'route-mid',
      'route-low',
    ]);
    expect(result[0].score).toBe(90);
  });

  it('throws BadRequestException when budget recommendation ratios do not sum to 1', async () => {
    await expect(
      service.getBudgetRecommendedRoutes({
        budget: 100000,
        ratios: {
          foodRatio: 0.5,
          experienceRatio: 0.4,
          transportRatio: 0.2,
        },
      }),
    ).rejects.toThrow('비용 분배 비율');

    expect(
      mockRouteRepository.findRecommendedCandidates,
    ).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when budget is out of range', async () => {
    const result = service.getBudgetRecommendedRoutes({
      budget: 9999,
    });

    await expect(result).rejects.toThrow(BadRequestException);
    await expect(result).rejects.toThrow('예산(budget)');

    expect(
      mockRouteRepository.findRecommendedCandidates,
    ).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when themeSlugs is not an array', async () => {
    const result = service.getBudgetRecommendedRoutes({
      budget: 100000,
      themeSlugs: 'local-food',
    });

    await expect(result).rejects.toThrow(BadRequestException);
    await expect(result).rejects.toThrow('themeSlugs');

    expect(
      mockRouteRepository.findRecommendedCandidates,
    ).not.toHaveBeenCalled();
  });
});

const createBudgetCandidate = (id: string, score: number) => ({
  id,
  name: `추천 루트 ${id}`,
  totalDistanceMeters: 3200,
  estimatedSavingsWon: 1000,
  score,
  routeType: 'RECOMMENDED',
  congestionLevel: 'MEDIUM',
  estimatedCostWon: 100000,
  foodCostWon: 40000,
  experienceCostWon: 40000,
  transportCostWon: 20000,
  totalDifficultyScore: 0,
  stops: [
    {
      orderIndex: 0,
      transitType: 'BUS',
      travelMinutesFromPrev: 20,
      stayMinutes: 10,
      fareWon: 1500,
      estimatedPriceWon: 9000,
      place: null,
    },
  ],
});
