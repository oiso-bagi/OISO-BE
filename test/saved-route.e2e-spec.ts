import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SavedRouteController } from '../src/route/saved-route.controller';
import { SavedRouteService } from '../src/route/saved-route.service';

describe('SavedRouteController (e2e)', () => {
  let app: INestApplication;
  const savedRouteService = {
    getSavedRouteList: jest.fn(),
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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

    await request(app.getHttpServer())
      .get('/saved-routes?userId=user-1')
      .expect(200)
      .expect(payload);

    expect(savedRouteService.getSavedRouteList).toHaveBeenCalledWith('user-1');
  });
});
