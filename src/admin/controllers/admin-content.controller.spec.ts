/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminContentController } from '@/admin/controllers/admin-content.controller';
import { AdminContentService } from '@/admin/services/admin-content.service';
import { AuthGuard } from '@/common/guards/auth.guard';

describe('AdminContentController', () => {
  let controller: AdminContentController;
  let service: jest.Mocked<AdminContentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminContentController],
      providers: [
        {
          provide: AdminContentService,
          useValue: {
            getRoutes: jest.fn(),
            toggleRoutePublished: jest.fn(),
            getPlaces: jest.fn(),
            togglePlaceActive: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminContentController>(AdminContentController);
    service = module.get(AdminContentService);
  });

  it('GET /admin/routes 라우팅 시 service.getRoutes를 호출해야 한다', async () => {
    const mockResult = {
      items: [],
      page: 1,
      size: 20,
      totalCount: 0,
      totalPages: 1,
    };
    service.getRoutes.mockResolvedValue(mockResult);

    const query = { page: 1, size: 20 };
    const result = await controller.getRoutes(query);

    expect(service.getRoutes).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockResult);
  });

  it('PATCH /admin/routes/:routeId/published 라우팅 시 service.toggleRoutePublished를 호출해야 한다', async () => {
    const mockResult = {
      id: 'route_1',
      name: '코스 1',
      theme: 'local-food',
      themeLabel: '부산 로컬 맛집',
      stopCount: 2,
      totalDistanceKm: 3.5,
      isPublished: true,
      createdAt: new Date(),
    };
    service.toggleRoutePublished.mockResolvedValue(mockResult);

    const body = { isPublished: true };
    const result = await controller.toggleRoutePublished('route_1', body);

    expect(service.toggleRoutePublished).toHaveBeenCalledWith('route_1', body);
    expect(result).toEqual(mockResult);
  });

  it('GET /admin/places 라우팅 시 service.getPlaces를 호출해야 한다', async () => {
    const mockResult = {
      items: [],
      page: 1,
      size: 20,
      totalCount: 0,
      totalPages: 1,
    };
    service.getPlaces.mockResolvedValue(mockResult);

    const query = { page: 1, size: 20 };
    const result = await controller.getPlaces(query);

    expect(service.getPlaces).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockResult);
  });

  it('PATCH /admin/places/:placeId/active 라우팅 시 service.togglePlaceActive를 호출해야 한다', async () => {
    const mockResult = {
      id: 'place_1',
      name: '장소 1',
      address: '부산시 해운대구',
      category: 'FOOD',
      tpiScore: 0.85,
      isActive: false,
      latitude: 35.1,
      longitude: 129.1,
    };
    service.togglePlaceActive.mockResolvedValue(mockResult);

    const body = { isActive: false };
    const result = await controller.togglePlaceActive('place_1', body);

    expect(service.togglePlaceActive).toHaveBeenCalledWith('place_1', body);
    expect(result).toEqual(mockResult);
  });
});
