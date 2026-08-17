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
            createRoute: jest.fn(),
            findRouteDetail: jest.fn(),
            updateRoute: jest.fn(),
          },
        },
        {
          provide: AdminPlaceRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminRouteBuilderService>(AdminRouteBuilderService);
    builderRepository = module.get(AdminRouteBuilderRepository);
    placeRepository = module.get(AdminPlaceRepository);
  });

  describe('createRoute', () => {
    it('stops가 비어있으면 BadRequestException을 던져야 한다', async () => {
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

    it('sequence가 1부터 연속되지 않으면 BadRequestException을 던져야 한다', async () => {
      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        durationDays: 1,
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            dayNumber: 1,
            sequence: 2,
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.createRoute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 placeId가 들어오면 NotFoundException을 던져야 한다', async () => {
      placeRepository.findById.mockResolvedValue(null);

      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        durationDays: 1,
        isPublished: true,
        stops: [
          {
            placeId: 'invalid_place',
            dayNumber: 1,
            sequence: 1,
            stayTimeMinutes: 60,
          },
        ],
      };

      await expect(service.createRoute(dto)).rejects.toThrow(NotFoundException);
    });

    it('정상적인 요청 시 코스를 생성하고 상세 객체를 반환해야 한다', async () => {
      placeRepository.findById.mockResolvedValue({ id: 'place_1' });
      const mockCreated = {
        id: 'route_new',
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
      builderRepository.createRoute.mockResolvedValue(mockCreated);

      const dto = {
        name: '테스트 코스',
        themeSlug: 'local-food',
        durationDays: 1,
        isPublished: true,
        stops: [
          {
            placeId: 'place_1',
            dayNumber: 1,
            sequence: 1,
            stayTimeMinutes: 60,
          },
        ],
      };

      const result = await service.createRoute(dto);
      expect(result.id).toBe('route_new');
    });
  });

  describe('getRouteDetail', () => {
    it('코스가 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      builderRepository.findRouteDetail.mockResolvedValue(null);

      await expect(service.getRouteDetail('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('존재하는 코스 상세를 성공적으로 반환해야 한다', async () => {
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
});
