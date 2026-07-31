import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SavedRouteRawData } from '@/route/dto/saved-route-list-response.dto';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';
import { SavedRouteService } from '@/route/services/saved-route.service';

describe('SavedRouteService', () => {
  let service: SavedRouteService;
  const mockSavedRouteRepository = {
    findListByUserId: jest.fn(),
    findDetailByRouteId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedRouteService,
        { provide: SavedRouteRepository, useValue: mockSavedRouteRepository },
      ],
    }).compile();

    service = module.get<SavedRouteService>(SavedRouteService);
  });

  beforeEach(() => {
    mockSavedRouteRepository.findListByUserId.mockReset();
    mockSavedRouteRepository.findDetailByRouteId.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('maps raw saved route items to SavedRouteListResponseDto', async () => {
    const mockDate = new Date('2026-07-24T10:00:00.000Z');
    const mockRawDataList: SavedRouteRawData[] = [
      {
        savedAt: mockDate,
        route: {
          id: 'route-1',
          name: '부산 해운대 감성 힐링 코스',
          totalDistanceMeters: 4200,
          estimatedSavingsWon: 3500,
          stops: [
            {
              orderIndex: 0,
              transitType: 'BUS',
              travelMinutesFromPrev: 20,
              stayMinutes: 30,
              fareWon: 1500,
              estimatedPriceWon: 5000,
              place: null,
            },
            {
              orderIndex: 1,
              transitType: 'WALKING',
              travelMinutesFromPrev: 10,
              stayMinutes: 20,
              fareWon: 0,
              estimatedPriceWon: 6000,
              place: null,
            },
          ],
          tripLogs: [{ isCompleted: true }],
        },
      },
      {
        savedAt: mockDate,
        route: {
          id: 'route-2',
          name: '부산 감천문화마을 코스',
          totalDistanceMeters: 5400,
          estimatedSavingsWon: 5000,
          stops: [],
          tripLogs: [],
        },
      },
    ];

    mockSavedRouteRepository.findListByUserId.mockResolvedValue(
      mockRawDataList,
    );

    const result = await service.getSavedRouteList('user-1');

    expect(mockSavedRouteRepository.findListByUserId).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result.savedRouteCount).toBe(2);
    expect(result.totalSavedSavingsWon).toBe(8500);
    expect(result.savedRoutes[0]).toEqual({
      routeId: 'route-1',
      routeName: '부산 해운대 감성 힐링 코스',
      savedAt: mockDate,
      isCompleted: true,
      stopCount: 2,
      totalDistanceKm: 4.2,
      transitTypes: ['BUS', 'WALKING'],
      totalCost: 12500,
      totalTimeMinutes: 80,
      estimatedSavingsWon: 3500,
    });
    expect(result.savedRoutes[1].isCompleted).toBe(false);
  });

  it('throws BadRequestException for invalid routeId', async () => {
    await expect(service.getSavedRouteDetail('  ', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for invalid userId', async () => {
    await expect(service.getSavedRouteDetail('route-1', '  ')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException if saved route is not found', async () => {
    mockSavedRouteRepository.findDetailByRouteId.mockResolvedValue(null);

    await expect(
      service.getSavedRouteDetail('route-999', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns SavedRouteDetailResponseDto for valid routeId', async () => {
    const mockDate = new Date('2026-07-24T10:00:00.000Z');
    const mockRawData: any = {
      savedAt: mockDate,
      route: {
        id: 'route-1',
        name: '부산 해운대 감성 힐링 코스',
        totalDistanceMeters: 4200,
        estimatedSavingsWon: 3500,
        score: 4.8,
        routeType: 'RECOMMENDED',
        congestionLevel: 'MEDIUM',
        stops: [
          {
            orderIndex: 0,
            transitType: 'BUS',
            travelMinutesFromPrev: 20,
            stayMinutes: 30,
            fareWon: 1500,
            estimatedPriceWon: 5000,
            place: {
              name: '해운대 해수욕장',
              category: 'NATURE',
              openTime: '00:00',
              closeTime: '24:00',
              latitude: 35.1587,
              longitude: 129.1604,
            },
          },
          {
            orderIndex: 1,
            transitType: 'WALKING',
            travelMinutesFromPrev: 10,
            stayMinutes: 20,
            fareWon: 0,
            estimatedPriceWon: 6000,
            place: {
              name: '해리단길 카페거리',
              category: 'CAFE',
              openTime: '10:00',
              closeTime: '22:00',
              latitude: 35.1632,
              longitude: 129.1589,
            },
          },
        ],
        tripLogs: [{ isCompleted: true }],
      },
    };

    mockSavedRouteRepository.findDetailByRouteId.mockResolvedValue(mockRawData);

    const result = await service.getSavedRouteDetail('route-1', 'user-1');

    expect(mockSavedRouteRepository.findDetailByRouteId).toHaveBeenCalledWith(
      'route-1',
      'user-1',
    );
    expect(result.routeId).toBe('route-1');
    expect(result.isCompleted).toBe(true);
    expect(result.stops[0].latitude).toBe(35.1587);
    expect(result.stops[0].nextTransportType).toBe('BUS');
    expect(result.stops[0].nextTravelTimeMinutes).toBe(20);
    expect(result.stops[1].nextTransportType).toBe('WALKING');
    expect(result.stops[1].nextTravelTimeMinutes).toBe(10);
  });
});
