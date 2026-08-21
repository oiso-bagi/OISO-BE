import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RouteRepository } from '@/route/repositories/route.repository';
import { RouteService } from '@/route/services/route.service';

describe('RouteService', () => {
  let service: RouteService;
  const mockRouteRepository = {
    findDetailWithStopsAndPlace: jest.fn(),
    findDetailsByIds: jest.fn(),
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
    expect(result[0]).toMatchObject({
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
    });
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

  it('returns stitched route detail successfully when stitched id is provided', async () => {
    mockRouteRepository.findDetailsByIds.mockResolvedValue([
      {
        id: 'route-1',
        name: '1일차 코스',
        totalDistanceMeters: 2000,
        estimatedSavingsWon: 1000,
        score: 4.5,
        routeType: 'RECOMMENDED',
        congestionLevel: 'MEDIUM',
        stops: [{ orderIndex: 0, place: { name: '해운대' } }],
      },
      {
        id: 'route-2',
        name: '2일차 코스',
        totalDistanceMeters: 3000,
        estimatedSavingsWon: 1500,
        score: 4.7,
        routeType: 'RECOMMENDED',
        congestionLevel: 'MEDIUM',
        stops: [{ orderIndex: 0, place: { name: '광안리' } }],
      },
    ]);

    const result = await service.getRecommendedRouteDetail(
      'stitched-route-1_route-2',
    );

    expect(result.routeId).toBe('stitched-route-1_route-2');
    const stops = result.stops;
    expect(stops).toBeDefined();
    expect(stops).toHaveLength(2);
    expect(stops?.[0]?.dayNumber).toBe(1);
    expect(stops?.[1]?.dayNumber).toBe(2);
    expect(stops?.[1]?.sequence).toBe(1);
  });

  it('parses single stitched route ID without underscore successfully', async () => {
    mockRouteRepository.findDetailsByIds.mockResolvedValue([
      {
        id: 'route-cmA',
        name: '단일 일차 코스',
        totalDistanceMeters: 1500,
        estimatedSavingsWon: 500,
        score: 4.0,
        routeType: 'RECOMMENDED',
        congestionLevel: 'LOW',
        stops: [{ orderIndex: 0, place: { name: '태종대' } }],
      },
    ]);

    const result =
      await service.getRecommendedRouteDetail('stitched-route-cmA');

    expect(result.routeId).toBe('stitched-route-cmA');
    expect(result.stops).toHaveLength(1);
  });

  it('throws BadRequestException when stitched route ID format parsing fails', async () => {
    await expect(
      service.getRecommendedRouteDetail('stitched-'),
    ).rejects.toThrow('stitched-route ID 파싱에 실패했습니다');
  });
});
