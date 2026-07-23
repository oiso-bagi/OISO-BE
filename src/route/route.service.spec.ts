import { Test, TestingModule } from '@nestjs/testing';
import { RouteRepository } from './route.repository';
import { RouteService } from './route.service';

describe('RouteService', () => {
  let service: RouteService;
  const mockRouteRepository = {
    findDetailWithStopsAndPlace: jest.fn(),
    findListWithStops: jest.fn(),
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
        routeType: 'SAVED',
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
        transitTypes: ['BUS'],
        totalCost: 12500,
        totalTimeMinutes: 80,
        estimatedSavingsWon: 1000,
        score: 4.7,
        isRecommended: true,
      },
    ]);
    expect(result[0]).not.toHaveProperty('stops');
  });
});
