import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { RouteController } from '@/route/controllers/route.controller';
import { RouteService } from '@/route/services/route.service';

type App = Parameters<typeof request>[0];

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
    app.setGlobalPrefix('api/v1');
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
    await request(app.getHttpServer() as App)
      .get('/api/v1/recommended-routes/%20')
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
        totalDistanceKm: 3.2,
        transitTypes: ['BUS', 'WALKING'],
        totalCost: 13000,
        totalTimeMinutes: 80,
        congestionLevel: 'MEDIUM',
        estimatedSavingsWon: 1000,
        score: 4.7,
        isRecommended: true,
        stopLocations: [],
      },
    ];

    routeService.getRecommendedRouteList.mockResolvedValue(payload);

    await request(app.getHttpServer() as App)
      .get('/api/v1/recommended-routes')
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
      congestionLevel: 'MEDIUM',
      savedCost: 1000,
      recommendScore: 4.7,
      isRecommended: true,
      isSaved: false,
      totalCost: 1000,
      totalTimeMinutes: 30,
      totalTimeDisplay: '30m',
      metaCost: { transportCost: 500, placeCost: 500 },
      metaTime: { pureTravelTime: 20, stayTime: 10 },
      stops: [],
    };

    routeService.getRecommendedRouteDetail.mockResolvedValue(payload);

    await request(app.getHttpServer() as App)
      .get('/api/v1/recommended-routes/route-1')
      .expect(200)
      .expect(payload);

    expect(routeService.getRecommendedRouteDetail).toHaveBeenCalledWith(
      'route-1',
    );
  });

  it('returns 200 for a stitched route id', async () => {
    const payload = {
      routeId: 'stitched-route-1_route-2',
      routeName: '[1박 2일] 부산 여행 패키지 코스',
      stopCount: 2,
      totalDistanceKm: 5.0,
      transportType: 'BUS',
      congestionLevel: 'MEDIUM',
      savedCost: 2000,
      recommendScore: 4.6,
      isRecommended: true,
      isSaved: false,
      totalCost: 2000,
      totalTimeMinutes: 60,
      totalTimeDisplay: '1h 0m',
      metaCost: { transportCost: 1000, placeCost: 1000 },
      metaTime: { pureTravelTime: 40, stayTime: 20 },
      stops: [
        { sequence: 0, dayNumber: 1, placeName: '해운대' },
        { sequence: 1, dayNumber: 2, placeName: '광안리' },
      ],
    };

    routeService.getRecommendedRouteDetail.mockResolvedValue(payload);

    await request(app.getHttpServer() as App)
      .get('/api/v1/recommended-routes/stitched-route-1_route-2')
      .expect(200)
      .expect(payload);

    expect(routeService.getRecommendedRouteDetail).toHaveBeenCalledWith(
      'stitched-route-1_route-2',
    );
  });

  it('returns 400 for invalid stitched route id format', async () => {
    routeService.getRecommendedRouteDetail.mockImplementation((id: string) => {
      if (id.trim() === 'stitched-') {
        throw new BadRequestException('stitched-route ID 파싱에 실패했습니다');
      }
      return Promise.resolve({} as any);
    });

    await request(app.getHttpServer() as App)
      .get('/api/v1/recommended-routes/stitched-%20')
      .expect(400);

    expect(routeService.getRecommendedRouteDetail).toHaveBeenCalledWith(
      'stitched-',
    );
  });
});
