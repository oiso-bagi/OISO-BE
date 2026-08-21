import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { SavedRouteRawData } from '@/route/dto/saved-route-list-response.dto';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';
import { RouteService } from '@/route/services/route.service';
import { SavedRouteService } from '@/route/services/saved-route.service';

describe('SavedRouteService', () => {
  let service: SavedRouteService;
  const mockSavedRouteRepository = {
    findListByUserId: jest.fn(),
    findDetailByRouteId: jest.fn(),
    findRouteById: jest.fn(),
    findSavedRoute: jest.fn(),
    createSavedRoute: jest.fn(),
    deleteSavedRoute: jest.fn(),
    upsertRouteTripCompletion: jest.fn(),
    ensureRouteExistsFromStitched: jest.fn(),
    findPlacesByIdsOrNames: jest.fn(),
  };
  const mockRouteService: Partial<Record<keyof RouteService, jest.Mock>> = {
    getRecommendedRouteDetail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedRouteService,
        { provide: SavedRouteRepository, useValue: mockSavedRouteRepository },
        { provide: RouteService, useValue: mockRouteService },
      ],
    }).compile();

    service = module.get<SavedRouteService>(SavedRouteService);
  });

  beforeEach(() => {
    mockSavedRouteRepository.findListByUserId.mockReset();
    mockSavedRouteRepository.findDetailByRouteId.mockReset();
    mockSavedRouteRepository.findRouteById.mockReset();
    mockSavedRouteRepository.findSavedRoute.mockReset();
    mockSavedRouteRepository.createSavedRoute.mockReset();
    mockSavedRouteRepository.deleteSavedRoute.mockReset();
    mockSavedRouteRepository.upsertRouteTripCompletion.mockReset();
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

  it('throws BadRequestException for invalid userId when listing saved routes', async () => {
    await expect(service.getSavedRouteList('  ')).rejects.toThrow(
      BadRequestException,
    );

    expect(mockSavedRouteRepository.findListByUserId).not.toHaveBeenCalled();
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
    ).rejects.toThrow('저장된 루트 ID [route-999]를 찾을 수 없습니다.');
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

  describe('saveRoute', () => {
    it('throws NotFoundException when route does not exist', async () => {
      mockSavedRouteRepository.findRouteById.mockResolvedValue(null);

      await expect(
        service.saveRoute('user-1', 'invalid-route'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates saved route record when valid route is provided', async () => {
      mockSavedRouteRepository.findRouteById.mockResolvedValue({
        id: 'route-1',
      });
      mockSavedRouteRepository.findSavedRoute.mockResolvedValue(null);
      mockSavedRouteRepository.createSavedRoute.mockResolvedValue({
        userId: 'user-1',
        routeId: 'route-1',
      });

      await service.saveRoute('user-1', 'route-1');

      expect(mockSavedRouteRepository.createSavedRoute).toHaveBeenCalledWith(
        'user-1',
        'route-1',
      );
    });

    it('saves stitched route successfully by creating route entity first if not exists', async () => {
      const stitchedId = 'stitched-route-1_route-2';
      const mockStitchedDetail = {
        routeName: '통합 코스',
        totalDistanceKm: 5.0,
        savedCost: 2000,
        recommendScore: 4.5,
        stops: [
          {
            placeName: '해운대',
            sequence: 0,
            dayNumber: 1,
            nextTransportType: 'BUS',
            nextTravelTimeMinutes: 20,
            stayMinutes: 60,
          },
          {
            placeName: '광안리',
            sequence: 1,
            dayNumber: 2,
            nextTransportType: null,
            nextTravelTimeMinutes: null,
            stayMinutes: 0,
          },
        ],
      } as unknown as RecommendedRouteDetailResponseDto;

      (
        mockRouteService.getRecommendedRouteDetail as jest.Mock
      ).mockResolvedValue(mockStitchedDetail);
      mockSavedRouteRepository.findPlacesByIdsOrNames.mockResolvedValue([
        { id: 'place-1', name: '해운대' },
        { id: 'place-2', name: '광안리' },
      ]);
      mockSavedRouteRepository.ensureRouteExistsFromStitched.mockResolvedValue(
        stitchedId,
      );
      mockSavedRouteRepository.findSavedRoute.mockResolvedValue(null);
      mockSavedRouteRepository.createSavedRoute.mockResolvedValue({
        userId: 'user-1',
        routeId: stitchedId,
      });

      await service.saveRoute('user-1', stitchedId);

      expect(mockRouteService.getRecommendedRouteDetail).toHaveBeenCalledWith(
        stitchedId,
      );
      expect(
        mockSavedRouteRepository.ensureRouteExistsFromStitched,
      ).toHaveBeenCalledWith(
        stitchedId,
        expect.objectContaining({
          name: '통합 코스',
          totalDistanceMeters: 5000,
          estimatedSavingsWon: 2000,
          score: 4.5,
          stops: [
            {
              placeId: 'place-1',
              orderIndex: 0,
              transitType: 'BUS',
              travelMinutesFromPrev: 20,
              stayMinutes: 60,
            },
            {
              placeId: 'place-2',
              orderIndex: 1,
              transitType: null,
              travelMinutesFromPrev: null,
              stayMinutes: 0,
            },
          ],
        }),
      );
      expect(mockSavedRouteRepository.createSavedRoute).toHaveBeenCalledWith(
        'user-1',
        stitchedId,
      );
    });

    it('throws NotFoundException when place in stitched route is not found in DB', async () => {
      const stitchedId = 'stitched-route-invalid-place';
      mockRouteService.getRecommendedRouteDetail.mockResolvedValue({
        name: '오류 코스',
        stops: [{ placeName: '존재하지 않는 장소' }],
      });
      mockSavedRouteRepository.findPlacesByIdsOrNames.mockResolvedValue([]);

      await expect(service.saveRoute('user-1', stitchedId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not duplicate create when already saved (idempotent)', async () => {
      mockSavedRouteRepository.findRouteById.mockResolvedValue({
        id: 'route-1',
      });
      mockSavedRouteRepository.findSavedRoute.mockResolvedValue({
        userId: 'user-1',
        routeId: 'route-1',
      });

      await service.saveRoute('user-1', 'route-1');

      expect(mockSavedRouteRepository.createSavedRoute).not.toHaveBeenCalled();
    });
  });

  describe('deleteSavedRoute', () => {
    it('throws NotFoundException when route was not saved before or deletion count is 0', async () => {
      mockSavedRouteRepository.deleteSavedRoute.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.deleteSavedRoute('user-1', 'unsaved-route'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes saved route record successfully', async () => {
      mockSavedRouteRepository.deleteSavedRoute.mockResolvedValue({
        count: 1,
      });

      await service.deleteSavedRoute('user-1', 'route-1');

      expect(mockSavedRouteRepository.deleteSavedRoute).toHaveBeenCalledWith(
        'user-1',
        'route-1',
      );
    });
  });

  describe('toggleRouteCompletion', () => {
    it('throws NotFoundException when route does not exist', async () => {
      mockSavedRouteRepository.findRouteById.mockResolvedValue(null);

      await expect(
        service.toggleRouteCompletion('user-1', 'invalid-route', {
          isCompleted: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when route is not saved in user storage or concurrent delete occurred', async () => {
      mockSavedRouteRepository.findRouteById.mockResolvedValue({
        id: 'route-1',
      });
      mockSavedRouteRepository.upsertRouteTripCompletion.mockResolvedValue(
        null,
      );

      await expect(
        service.toggleRouteCompletion('user-1', 'route-1', {
          isCompleted: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('upserts route trip completion status successfully when route is saved', async () => {
      mockSavedRouteRepository.findRouteById.mockResolvedValue({
        id: 'route-1',
      });
      mockSavedRouteRepository.upsertRouteTripCompletion.mockResolvedValue({
        id: 'trip-1',
        userId: 'user-1',
        routeId: 'route-1',
        isCompleted: true,
        actualCostWon: 40000,
      });

      const result = await service.toggleRouteCompletion('user-1', 'route-1', {
        isCompleted: true,
        actualCostWon: 40000,
      });

      expect(
        mockSavedRouteRepository.upsertRouteTripCompletion,
      ).toHaveBeenCalledWith('user-1', 'route-1', true, 40000);
      expect(result.routeId).toBe('route-1');
      expect(result.isCompleted).toBe(true);
      expect(result.actualCostWon).toBe(40000);
    });
  });
});
