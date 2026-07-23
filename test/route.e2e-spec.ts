import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { RouteController } from '../src/route/route.controller';
import { RouteService } from '../src/route/route.service';

describe('RouteController (e2e)', () => {
  let app: INestApplication;
  const routeService = {
    getRecommendedRouteList: jest.fn(),
    getRecommendedRouteDetail: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [{ provide: RouteService, useValue: routeService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    routeService.getRecommendedRouteList.mockReset();
    routeService.getRecommendedRouteDetail.mockReset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 400 for an empty route id', async () => {
    await request(app.getHttpServer())
      .get('/recommended-routes/%20')
      .expect(400);
    expect(routeService.getRecommendedRouteDetail).not.toHaveBeenCalled();
  });

  it('returns 200 for route list', async () => {
    const payload = [
      {
        id: 'route-1',
        name: '부산 힐링 루트',
        stopCount: 2,
        totalDistanceMeters: 3200,
        transitTypes: ['BUS', 'WALKING'],
        totalCost: 13000,
        totalTimeMinutes: 80,
        estimatedSavingsWon: 1000,
        score: 4.7,
        isRecommended: true,
      },
    ];

    routeService.getRecommendedRouteList.mockResolvedValue(payload);

    await request(app.getHttpServer())
      .get('/recommended-routes')
      .expect(200)
      .expect(payload);

    expect(routeService.getRecommendedRouteList).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for a valid route id', async () => {
    const payload = {
      routeId: 'route-1',
      routeName: '부산 힐링 루트',
      stopCount: 1,
      totalDistanceKm: 3.2,
      transportType: 'BUS',
      savedCost: 1000,
      recommendScore: 4.7,
      isRecommended: true,
      totalCost: 1000,
      totalTimeMinutes: 30,
      totalTimeDisplay: '30m',
      metaCost: { transportCost: 500, placeCost: 500 },
      metaTime: { pureTravelTime: 20, stayTime: 10 },
      stops: [],
    };

    routeService.getRecommendedRouteDetail.mockResolvedValue(payload);

    await request(app.getHttpServer())
      .get('/recommended-routes/route-1')
      .expect(200)
      .expect(payload);

    expect(routeService.getRecommendedRouteDetail).toHaveBeenCalledWith(
      'route-1',
    );
  });
});
