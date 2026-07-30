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

    it('passes requested budget to findRecommendedCandidates and returns top 3 routes', async () => {
      const mockCandidates = [
        {
          id: 'route-1',
          name: '루트 1',
          score: 80,
          estimatedCostWon: 10000,
          foodCostWon: 4000,
          experienceCostWon: 4000,
          transportCostWon: 2000,
          congestionLevel: 'MEDIUM',
        },
        {
          id: 'route-2',
          name: '루트 2',
          score: 85,
          estimatedCostWon: 10000,
          foodCostWon: 3000,
          experienceCostWon: 5000,
          transportCostWon: 2000,
          congestionLevel: 'MEDIUM',
        },
        {
          id: 'route-3',
          name: '루트 3',
          score: 80,
          estimatedCostWon: 10000,
          foodCostWon: 2000,
          experienceCostWon: 6000,
          transportCostWon: 2000,
          congestionLevel: 'MEDIUM',
        },
        {
          id: 'route-4',
          name: '루트 4',
          score: 50,
          estimatedCostWon: 10000,
          foodCostWon: 1000,
          experienceCostWon: 8000,
          transportCostWon: 1000,
          congestionLevel: 'HIGH',
        },
      ];

      mockRouteRepository.findRecommendedCandidates.mockResolvedValue(
        mockCandidates,
      );

      const result = await service.getRecommendedRoutes({
        budget: 15000,
        ratios: { foodRatio: 0.4, experienceRatio: 0.4, transportRatio: 0.2 },
      });

      expect(
        mockRouteRepository.findRecommendedCandidates,
      ).toHaveBeenCalledWith(15000, undefined);
      expect(result.length).toBe(3);
    });

    it('independently ranks LOW congestion route higher than HIGH congestion route given identical base score and ratios', async () => {
      const mockCandidates = [
        {
          id: 'route-high',
          name: '혼잡한 루트',
          score: 80,
          estimatedCostWon: 10000,
          foodCostWon: 4000, // 0.4
          experienceCostWon: 4000, // 0.4
          transportCostWon: 2000, // 0.2
          congestionLevel: 'HIGH', // -5.0 감점
        },
        {
          id: 'route-low',
          name: '쾌적한 루트',
          score: 80,
          estimatedCostWon: 10000,
          foodCostWon: 4000, // 0.4
          experienceCostWon: 4000, // 0.4
          transportCostWon: 2000, // 0.2
          congestionLevel: 'LOW', // +3.0 가점
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
      expect(result[0].id).toBe('route-low');
      expect(result[1].id).toBe('route-high');
    });
  });
});
