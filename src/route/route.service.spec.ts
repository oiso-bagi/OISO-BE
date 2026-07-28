import { Test, TestingModule } from '@nestjs/testing';
import { RouteRepository } from './route.repository';
import { RouteService } from './route.service';

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('maps repository list items to RecommendedRouteListResponseDto', async () => {
    mockRouteRepository.findListWithStops.mockResolvedValue([
      {
        id: 'route-1',
        name: '부산 힐링 루트',
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
        name: '부산 힐링 루트',
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

  describe('getRecommendedRoutes', () => {
    it('throws BadRequestException if budget is invalid', async () => {
      await expect(
        service.getRecommendedRoutes({
          budget: 0,
          ratios: { foodRatio: 0.4, experienceRatio: 0.4, transportRatio: 0.2 },
        }),
      ).rejects.toThrow('유효한 총 예산(budget)을 입력해 주세요.');
    });

    it('filters candidates by budget and ranks by finalScore returning top 3', async () => {
      const mockCandidates = [
        {
          id: 'route-1',
          name: '루트 1',
          score: 80,
          estimatedCostWon: 10000,
          foodCostWon: 4000, // 0.4
          experienceCostWon: 4000, // 0.4
          transportCostWon: 2000, // 0.2
        },
        {
          id: 'route-2',
          name: '루트 2',
          score: 90,
          estimatedCostWon: 10000,
          foodCostWon: 1000, // 0.1 (오차 큼)
          experienceCostWon: 8000, // 0.8
          transportCostWon: 1000, // 0.1
        },
      ];

      mockRouteRepository.findRecommendedCandidates.mockResolvedValue(
        mockCandidates,
      );

      const result = await service.getRecommendedRoutes({
        budget: 15000,
        ratios: { foodRatio: 0.4, experienceRatio: 0.4, transportRatio: 0.2 },
      });

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('route-1'); // 오차 적은 루트1이 1위
    });
  });
});
