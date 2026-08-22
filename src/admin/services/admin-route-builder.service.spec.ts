/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteBuilderRepository } from '@/admin/repositories/admin-route-builder.repository';
import { AdminRouteBuilderService } from '@/admin/services/admin-route-builder.service';

describe('AdminRouteBuilderService', () => {
  let service: AdminRouteBuilderService;
  let builderRepository: jest.Mocked<AdminRouteBuilderRepository>;
  let placeRepository: jest.Mocked<AdminPlaceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRouteBuilderService,
        {
          provide: AdminRouteBuilderRepository,
          useValue: {
            findThemeIdBySlug: jest.fn(),
            findPlacesCoordinates: jest.fn(),
            createRoute: jest.fn(),
            findRouteDetail: jest.fn(),
            updateRoute: jest.fn(),
          },
        },
        {
          provide: AdminPlaceRepository,
          useValue: {
            findById: jest.fn(),
            findManyByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminRouteBuilderService>(AdminRouteBuilderService);
    builderRepository = module.get(AdminRouteBuilderRepository);
    placeRepository = module.get(AdminPlaceRepository);
  });

  describe('createRoute', () => {
    it('테마 슬러그가 존재하지 않으면 BadRequestException을 던져야 한다', async () => {
      builderRepository.findThemeIdBySlug.mockResolvedValue(null);

      const dto = {
        name: '테스트 코스',
        themeSlug: 'invalid-theme',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 0,
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.createRoute(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(builderRepository.createRoute).not.toHaveBeenCalled();
    });

    it('stops가 비어있으면 BadRequestException을 던져야 한다', async () => {
      builderRepository.findThemeIdBySlug.mockResolvedValue('theme_1');

      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        durationDays: 1,
        isPublished: true,
        stops: [],
      };

      await expect(service.createRoute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sequence가 0부터 연속되지 않으면 BadRequestException을 던져야 한다', async () => {
      builderRepository.findThemeIdBySlug.mockResolvedValue('theme_1');

      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 1, // 0부터 시작해야 함
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.createRoute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 placeId가 포함되면 BadRequestException을 던져야 한다', async () => {
      builderRepository.findThemeIdBySlug.mockResolvedValue('theme_1');
      placeRepository.findManyByIds.mockResolvedValue([]);

      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        isPublished: true,
        stops: [
          {
            placeId: 'invalid_id',
            sequence: 0,
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.createRoute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('정상적인 DTO 요청 시 createRoute를 호출하고 생성 결과를 반환해야 한다', async () => {
      builderRepository.findThemeIdBySlug.mockResolvedValue('theme_1');
      placeRepository.findManyByIds.mockResolvedValue([
        {
          id: 'place_1',
          name: '장소1',
          address: '주소1',
          category: 'FOOD',
          latitude: '35.15',
          longitude: '129.11',
        },
        {
          id: 'place_2',
          name: '장소2',
          address: '주소2',
          category: 'CAFE',
          latitude: '35.16',
          longitude: '129.12',
        },
      ]);
      (builderRepository.findPlacesCoordinates as jest.Mock).mockResolvedValue([
        { id: 'place_1', latitude: '35.15', longitude: '129.11' },
        { id: 'place_2', latitude: '35.16', longitude: '129.12' },
      ]);

      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 0,
            stayTimeMinutes: 60,
            nextTravelCostWon: 1500,
          },
          {
            placeId: 'place_2',
            sequence: 1,
            stayTimeMinutes: 45,
            nextTravelCostWon: 2000, // 마지막 stop의 이동비용은 제외되어야 함
          },
        ],
      };

      const mockResult = {
        id: 'route_1',
        name: '테스트 코스',
        description: null,
        themeSlug: 'local-food',
        themeLabel: '부산 로컬 맛집',
        durationDays: 1,
        stopCount: 2,
        totalDistanceKm: 2.1,
        isPublished: true,
        createdAt: new Date(),
        stops: [],
      };

      builderRepository.createRoute.mockResolvedValue(mockResult);

      const result = await service.createRoute(dto);
      expect(builderRepository.createRoute).toHaveBeenCalledWith(
        dto,
        'theme_1',
        expect.objectContaining({
          totalTransportCostWon: 1500, // 첫번째 stop 비용만 합산
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getRouteDetail', () => {
    it('코스가 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      builderRepository.findRouteDetail.mockResolvedValue(null);

      await expect(service.getRouteDetail('nonexistent_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('존재하는 코스 정보면 결과를 반환해야 한다', async () => {
      const mockDetail = {
        id: 'route_1',
        name: '테스트 코스',
        description: null,
        themeSlug: 'local-food',
        themeLabel: '부산 로컬 맛집',
        durationDays: 1,
        stopCount: 1,
        totalDistanceKm: 2.1,
        isPublished: true,
        createdAt: new Date(),
        stops: [],
      };
      builderRepository.findRouteDetail.mockResolvedValue(mockDetail);

      const result = await service.getRouteDetail('route_1');
      expect(result.id).toBe('route_1');
    });
  });

  describe('updateRoute', () => {
    it('수정 대상 코스가 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      builderRepository.findRouteDetail.mockResolvedValue(null);

      const dto = {
        name: '수정 테스트 코스',
        themeSlug: 'local-food',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 1,
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.updateRoute('nonexistent_id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('수정 시 테마 슬러그가 존재하지 않으면 BadRequestException을 던져야 한다', async () => {
      const mockDetail = {
        id: 'route_1',
        name: '테스트 코스',
        description: null,
        themeSlug: 'local-food',
        themeLabel: '부산 로컬 맛집',
        durationDays: 1,
        stopCount: 1,
        totalDistanceKm: 2.1,
        isPublished: true,
        createdAt: new Date(),
        stops: [],
      };
      builderRepository.findRouteDetail.mockResolvedValue(mockDetail);
      builderRepository.findThemeIdBySlug.mockResolvedValue(null);

      const dto = {
        name: '수정 테스트 코스',
        themeSlug: 'invalid-theme',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 1,
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.updateRoute('route_1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(builderRepository.updateRoute).not.toHaveBeenCalled();
    });

    it('sequence가 0부터 연속되지 않으면 BadRequestException을 던져야 한다', async () => {
      const mockDetail = {
        id: 'route_1',
        name: '테스트 코스',
        description: null,
        themeSlug: 'local-food',
        themeLabel: '부산 로컬 맛집',
        durationDays: 1,
        stopCount: 1,
        totalDistanceKm: 2.1,
        isPublished: true,
        createdAt: new Date(),
        stops: [],
      };
      builderRepository.findRouteDetail.mockResolvedValue(mockDetail);
      builderRepository.findThemeIdBySlug.mockResolvedValue('theme_1');

      const dto = {
        name: '수정 테스트 코스',
        themeSlug: 'local-food',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 1, // 0부터 시작해야 함
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.updateRoute('route_1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('정상적인 DTO 요청 시 updateRoute를 호출하고 집계 결과를 올바르게 전달해야 한다', async () => {
      const mockDetail = {
        id: 'route_1',
        name: '기존 테스트 코스',
        description: null,
        themeSlug: 'local-food',
        themeLabel: '부산 로컬 맛집',
        durationDays: 1,
        stopCount: 2,
        totalDistanceKm: 2.1,
        isPublished: true,
        createdAt: new Date(),
        stops: [],
      };
      builderRepository.findRouteDetail.mockResolvedValue(mockDetail);
      builderRepository.findThemeIdBySlug.mockResolvedValue('theme_1');
      placeRepository.findManyByIds.mockResolvedValue([
        {
          id: 'place_1',
          name: '장소1',
          address: '주소1',
          category: 'FOOD',
          latitude: '35.15',
          longitude: '129.11',
        },
        {
          id: 'place_2',
          name: '장소2',
          address: '주소2',
          category: 'CAFE',
          latitude: '35.16',
          longitude: '129.12',
        },
      ]);
      (builderRepository.findPlacesCoordinates as jest.Mock).mockResolvedValue([
        { id: 'place_1', latitude: '35.15', longitude: '129.11' },
        { id: 'place_2', latitude: '35.16', longitude: '129.12' },
      ]);

      const dto = {
        name: '수정된 코스',
        themeSlug: 'local-food',
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            sequence: 0,
            stayTimeMinutes: 60,
            nextTravelCostWon: 1200,
          },
          {
            placeId: 'place_2',
            sequence: 1,
            stayTimeMinutes: 30,
            nextTravelCostWon: 5000,
          },
        ],
      };

      builderRepository.updateRoute.mockResolvedValue(mockDetail);

      const result = await service.updateRoute('route_1', dto);
      expect(builderRepository.updateRoute).toHaveBeenCalledWith(
        'route_1',
        dto,
        'theme_1',
        expect.objectContaining({
          totalTransportCostWon: 1200, // 마지막 stop 5000원 제외
        }),
      );
      expect(result).toEqual(mockDetail);
    });
  });
});
