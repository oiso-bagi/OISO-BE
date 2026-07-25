import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SavedRouteController } from '../src/route/saved-route.controller';
import { SavedRouteService } from '../src/route/saved-route.service';

type App = Parameters<typeof request>[0];

describe('SavedRouteController (e2e)', () => {
  let app: INestApplication;
  const savedRouteService = {
    getSavedRouteList: jest.fn(),
    getSavedRouteDetail: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SavedRouteController],
      providers: [{ provide: SavedRouteService, useValue: savedRouteService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    savedRouteService.getSavedRouteList.mockReset();
    savedRouteService.getSavedRouteDetail.mockReset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 400 for empty routeId in GET /saved-routes/:routeId', async () => {
    await request(app.getHttpServer() as App)
      .get('/saved-routes/%20?userId=user-1')
      .expect(400);
    expect(savedRouteService.getSavedRouteDetail).not.toHaveBeenCalled();
  });

  it('returns 200 and saved route list payload for GET /saved-routes', async () => {
    const payload = {
      savedRouteCount: 1,
      totalSavedSavingsWon: 3500,
      savedRoutes: [
        {
          routeId: 'route-1',
          routeName: '부산 해운대 감성 힐링 코스',
          savedAt: '2026-07-24T10:00:00.000Z',
          isCompleted: true,
          stopCount: 2,
          totalDistanceKm: 4.2,
          transitTypes: ['BUS', 'WALKING'],
          totalCost: 12500,
          totalTimeMinutes: 80,
          estimatedSavingsWon: 3500,
        },
      ],
    };

    savedRouteService.getSavedRouteList.mockResolvedValue(payload);

    await request(app.getHttpServer() as App)
      .get('/saved-routes?userId=user-1')
      .expect(200)
      .expect(payload);

    expect(savedRouteService.getSavedRouteList).toHaveBeenCalledWith('user-1');
  });

  it('returns 200 and detail payload for GET /saved-routes/:routeId', async () => {
    const payload = {
      routeId: 'route-1',
      routeName: '부산 해운대 감성 힐링 코스',
      savedAt: '2026-07-24T10:00:00.000Z',
      isCompleted: true,
      stopCount: 1,
      totalDistanceKm: 4.2,
      transportType: 'BUS',
      congestionLevel: 'MEDIUM',
      savedCost: 3500,
      recommendScore: 4.8,
      isRecommended: true,
      isSaved: true,
      totalCost: 12500,
      totalTimeMinutes: 80,
      totalTimeDisplay: '1h 20m',
      metaCost: { transportCost: 1500, placeCost: 11000 },
      metaTime: { pureTravelTime: 30, stayTime: 50 },
      estimatedSavingsWon: 3500,
      stops: [
        {
          sequence: 0,
          placeName: '해운대 해수욕장',
          category: 'NATURE',
          openTime: '00:00',
          closeTime: '24:00',
          nextTransportType: 'BUS',
          nextTravelTimeMinutes: 20,
          latitude: 35.1587,
          longitude: 129.1604,
        },
      ],
    };

    savedRouteService.getSavedRouteDetail.mockResolvedValue(payload);

    await request(app.getHttpServer() as App)
      .get('/saved-routes/route-1?userId=user-1')
      .expect(200)
      .expect(payload);

    expect(savedRouteService.getSavedRouteDetail).toHaveBeenCalledWith(
      'route-1',
      'user-1',
    );
  });
});
