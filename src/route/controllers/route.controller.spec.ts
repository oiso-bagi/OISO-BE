import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RouteController } from '@/route/controllers/route.controller';
import { RouteService } from '@/route/services/route.service';

describe('RouteController', () => {
  let controller: RouteController;
  const mockRouteService = {
    getRecommendedRouteList: jest.fn(),
    getRecommendedRouteDetail: jest.fn(),
    getBudgetRecommendedRoutes: jest.fn(),
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
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates recommended route list retrieval to service', async () => {
    const payload = [
      {
        id: 'route-1',
        name: '부산 야경 루트',
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

  it('delegates budget based recommendation retrieval to service', async () => {
    const body = {
      budget: 100000,
      ratios: {
        foodRatio: 0.4,
        experienceRatio: 0.4,
        transportRatio: 0.2,
      },
      themeSlugs: ['local-food'],
    };
    const payload = [{ id: 'route-1', name: '부산 예산 추천 루트' }];
    mockRouteService.getBudgetRecommendedRoutes.mockResolvedValue(payload);

    await expect(controller.getBudgetRecommendedRoutes(body)).resolves.toEqual(
      payload,
    );
    expect(mockRouteService.getBudgetRecommendedRoutes).toHaveBeenCalledWith(
      body,
    );
  });

  it('documents budget recommendation budget as an int32 integer range', async () => {
    const module = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        {
          provide: RouteService,
          useValue: mockRouteService,
        },
      ],
    }).compile();
    const app = module.createNestApplication();

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const requestSchema = getRecordValue(
      document.components?.schemas,
      'BudgetRecommendRouteRequestDto',
    );

    if (!isRecord(requestSchema)) {
      throw new Error(
        'BudgetRecommendRouteRequestDto schema was not generated',
      );
    }

    const budgetSchema = getRecordValue(
      getRecordValue(requestSchema, 'properties'),
      'budget',
    );

    if (!isRecord(budgetSchema)) {
      throw new Error('budget schema was not generated');
    }

    expect(budgetSchema).toEqual(
      expect.objectContaining({
        type: 'integer',
        format: 'int32',
        minimum: 10000,
        maximum: 500000,
      }),
    );

    await app.close();
  });
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getRecordValue = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;
