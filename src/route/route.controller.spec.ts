import { Test, TestingModule } from '@nestjs/testing';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';

describe('RouteController', () => {
  let controller: RouteController;
  const mockRouteService = {
    getRecommendedRouteList: jest.fn(),
    getRecommendedRouteDetail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        {
          provide: RouteService,
          useValue: mockRouteService,
        },
      ],
    }).compile();

    controller = module.get<RouteController>(RouteController);
    mockRouteService.getRecommendedRouteList.mockReset();
    mockRouteService.getRecommendedRouteDetail.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates recommended route list retrieval to service', async () => {
    const payload = [
      {
        id: 'route-1',
        name: '부산 힐링 루트',
        stopCount: 2,
        totalDistanceMeters: 3200,
        transitTypes: ['BUS'],
        totalCost: 13000,
        totalTimeMinutes: 80,
        estimatedSavingsWon: 1000,
        score: 4.7,
        isRecommended: true,
      },
    ];

    mockRouteService.getRecommendedRouteList.mockResolvedValue(payload);

    await expect(controller.getList()).resolves.toEqual(payload);
    expect(mockRouteService.getRecommendedRouteList).toHaveBeenCalledTimes(1);
  });
});
