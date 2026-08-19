/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRouteBuilderController } from '@/admin/controllers/admin-route-builder.controller';
import { AdminRouteBuilderService } from '@/admin/services/admin-route-builder.service';
import { AuthGuard } from '@/common/guards/auth.guard';

describe('AdminRouteBuilderController', () => {
  let controller: AdminRouteBuilderController;
  let service: jest.Mocked<AdminRouteBuilderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminRouteBuilderController],
      providers: [
        {
          provide: AdminRouteBuilderService,
          useValue: {
            createRoute: jest.fn(),
            getRouteDetail: jest.fn(),
            updateRoute: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminRouteBuilderController>(
      AdminRouteBuilderController,
    );
    service = module.get(AdminRouteBuilderService);
  });

  it('POST /admin/routes 호출 시 service.createRoute를 호출해야 한다', async () => {
    const mockDetail = {
      id: 'route_1',
      name: '새 코스',
      description: null,
      themeSlug: 'local-food',
      themeLabel: '부산 로컬 맛집',
      durationDays: 1,
      stopCount: 1,
      totalDistanceKm: 1.2,
      isPublished: true,
      createdAt: new Date(),
      stops: [],
    };
    service.createRoute.mockResolvedValue(mockDetail);

    const body = {
      name: '새 코스',
      themeSlug: 'local-food',
      durationDays: 1,
      isPublished: true,
      stops: [
        { placeId: 'place_1', dayNumber: 1, sequence: 0, stayTimeMinutes: 60 },
      ],
    };

    const result = await controller.createRoute(body);
    expect(service.createRoute).toHaveBeenCalledWith(body);
    expect(result).toEqual(mockDetail);
  });

  it('GET /admin/routes/:routeId 호출 시 service.getRouteDetail을 호출해야 한다', async () => {
    const mockDetail = {
      id: 'route_1',
      name: '새 코스',
      description: null,
      themeSlug: 'local-food',
      themeLabel: '부산 로컬 맛집',
      durationDays: 1,
      stopCount: 1,
      totalDistanceKm: 1.2,
      isPublished: true,
      createdAt: new Date(),
      stops: [],
    };
    service.getRouteDetail.mockResolvedValue(mockDetail);

    const result = await controller.getRouteDetail('route_1');
    expect(service.getRouteDetail).toHaveBeenCalledWith('route_1');
    expect(result).toEqual(mockDetail);
  });

  it('PUT /admin/routes/:routeId 호출 시 service.updateRoute를 호출해야 한다', async () => {
    const mockDetail = {
      id: 'route_1',
      name: '수정 코스',
      description: null,
      themeSlug: 'local-food',
      themeLabel: '부산 로컬 맛집',
      durationDays: 1,
      stopCount: 1,
      totalDistanceKm: 1.2,
      isPublished: true,
      createdAt: new Date(),
      stops: [],
    };
    service.updateRoute.mockResolvedValue(mockDetail);

    const body = {
      name: '수정 코스',
      themeSlug: 'local-food',
      durationDays: 1,
      isPublished: true,
      stops: [
        { placeId: 'place_1', dayNumber: 1, sequence: 0, stayTimeMinutes: 60 },
      ],
    };

    const result = await controller.updateRoute('route_1', body);
    expect(service.updateRoute).toHaveBeenCalledWith('route_1', body);
    expect(result).toEqual(mockDetail);
  });
});
