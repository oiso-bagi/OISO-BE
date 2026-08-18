import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminContentService } from '@/admin/services/admin-content.service';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteRepository } from '@/admin/repositories/admin-route.repository';

describe('AdminContentService', () => {
  let service: AdminContentService;
  let adminRouteRepository: jest.Mocked<AdminRouteRepository>;
  let adminPlaceRepository: jest.Mocked<AdminPlaceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminContentService,
        {
          provide: AdminRouteRepository,
          useValue: {
            findRoutes: jest.fn(),
            updatePublishedStatus: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: AdminPlaceRepository,
          useValue: {
            findPlaces: jest.fn(),
            updateActiveStatus: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminContentService>(AdminContentService);
    adminRouteRepository = module.get(AdminRouteRepository);
    adminPlaceRepository = module.get(AdminPlaceRepository);
  });

  describe('getRoutes', () => {
    it('추천 코스 목록 및 페이지네이션 정보를 반환해야 한다', async () => {
      const mockItems = [
        {
          id: 'route_1',
          name: '부산 맛집',
          theme: 'local-food',
          themeLabel: '부산 로컬 맛집',
          stopCount: 3,
          totalDistanceKm: 4.2,
          isPublished: true,
          createdAt: new Date(),
        },
      ];
      adminRouteRepository.findRoutes.mockResolvedValue({
        items: mockItems,
        totalCount: 1,
      });

      const result = await service.getRoutes({ page: 1, size: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('toggleRoutePublished', () => {
    it('코스가 존재하지 않으면 NotFoundException을 발생시켜야 한다', async () => {
      adminRouteRepository.findById.mockResolvedValue(null);

      await expect(
        service.toggleRoutePublished('invalid_id', { isPublished: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('게시 상태를 정상적으로 변경해야 한다', async () => {
      const mockRoute = {
        id: 'route_1',
        name: '부산 맛집',
        theme: 'local-food',
        themeLabel: '부산 로컬 맛집',
        stopCount: 3,
        totalDistanceKm: 4.2,
        isPublished: false,
        createdAt: new Date(),
      };
      adminRouteRepository.findById.mockResolvedValue({ id: 'route_1' });
      adminRouteRepository.updatePublishedStatus.mockResolvedValue(mockRoute);

      const result = await service.toggleRoutePublished('route_1', {
        isPublished: false,
      });

      expect(result.isPublished).toBe(false);
    });
  });

  describe('getPlaces', () => {
    it('장소 목록 및 페이지네이션 정보를 반환해야 한다', async () => {
      const mockItems = [
        {
          id: 'place_1',
          name: '해운대',
          address: '부산 해운대구',
          category: 'NATURE',
          tpiScore: 0.85,
          isActive: true,
          latitude: 35.1,
          longitude: 129.1,
        },
      ];
      adminPlaceRepository.findPlaces.mockResolvedValue({
        items: mockItems,
        totalCount: 1,
      });

      const result = await service.getPlaces({ page: 1, size: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('togglePlaceActive', () => {
    it('장소가 존재하지 않으면 NotFoundException을 발생시켜야 한다', async () => {
      adminPlaceRepository.findById.mockResolvedValue(null);

      await expect(
        service.togglePlaceActive('invalid_id', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('활성화 상태를 정상적으로 변경해야 한다', async () => {
      const mockPlace = {
        id: 'place_1',
        name: '해운대',
        address: '부산 해운대구',
        category: 'NATURE',
        tpiScore: 0.85,
        isActive: false,
        latitude: 35.1,
        longitude: 129.1,
      };
      adminPlaceRepository.findById.mockResolvedValue({ id: 'place_1' });
      adminPlaceRepository.updateActiveStatus.mockResolvedValue(mockPlace);

      const result = await service.togglePlaceActive('place_1', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });
  });
});
