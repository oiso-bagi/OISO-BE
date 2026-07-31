import { Test, TestingModule } from '@nestjs/testing';
import { HomeRepository } from '@/home/repositories/home.repository';
import { HomeService } from '@/home/services/home.service';

describe('HomeService', () => {
  let service: HomeService;
  const mockHomeRepository = {
    findSavedRoutesByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: HomeRepository, useValue: mockHomeRepository },
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHomeSummary', () => {
    it('calculates total saved savings won and returns list of saved route items', async () => {
      const mockRawData = [
        {
          userId: 'user-1',
          routeId: 'route-101',
          savedAt: new Date('2026-07-30T10:00:00Z'),
          route: {
            id: 'route-101',
            name: '부산 해안산책 코스',
            estimatedSavingsWon: 15000,
            totalDistanceMeters: 8500,
          },
        },
        {
          userId: 'user-1',
          routeId: 'route-102',
          savedAt: new Date('2026-07-29T10:00:00Z'),
          route: {
            id: 'route-102',
            name: '감천문화마을 코스',
            estimatedSavingsWon: 20000,
            totalDistanceMeters: 6200,
          },
        },
      ];

      mockHomeRepository.findSavedRoutesByUserId.mockResolvedValue(mockRawData);

      const result = await service.getHomeSummary('user-1');

      expect(mockHomeRepository.findSavedRoutesByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result.totalSavedCount).toBe(2);
      expect(result.totalSavedSavingsWon).toBe(35000);
      expect(result.savedRoutes.length).toBe(2);
      expect(result.savedRoutes[0].name).toBe('부산 해안산책 코스');
      expect(result.savedRoutes[0].savingsWon).toBe(15000);
      expect(result.savedRoutes[0].totalDistanceKm).toBe(8.5);
    });

    it('returns 0 total savings and empty array when user has no saved routes', async () => {
      mockHomeRepository.findSavedRoutesByUserId.mockResolvedValue([]);

      const result = await service.getHomeSummary('user-empty');

      expect(result.totalSavedCount).toBe(0);
      expect(result.totalSavedSavingsWon).toBe(0);
      expect(result.savedRoutes).toEqual([]);
    });

    it('applies 0 defaults when estimatedSavingsWon and totalDistanceMeters are null', async () => {
      const mockRawDataWithNulls = [
        {
          userId: 'user-null',
          routeId: 'route-null-1',
          savedAt: new Date('2026-07-30T10:00:00Z'),
          route: {
            id: 'route-null-1',
            name: '정보 없는 코스',
            estimatedSavingsWon: null,
            totalDistanceMeters: null,
          },
        },
      ];

      mockHomeRepository.findSavedRoutesByUserId.mockResolvedValue(
        mockRawDataWithNulls,
      );

      const result = await service.getHomeSummary('user-null');

      expect(result.totalSavedCount).toBe(1);
      expect(result.totalSavedSavingsWon).toBe(0);
      expect(result.savedRoutes[0].savingsWon).toBe(0);
      expect(result.savedRoutes[0].totalDistanceKm).toBe(0);
    });
  });
});
