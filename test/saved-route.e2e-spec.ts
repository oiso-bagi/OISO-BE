import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CongestionLevel,
  PlaceCategory,
  RouteType,
  TransitType,
} from '@prisma/client';
import request from 'supertest';
import { AuthGuard } from '@/common/guards/auth.guard';
import { SavedRouteController } from '@/route/controllers/saved-route.controller';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';
import { RouteService } from '@/route/services/route.service';
import { SavedRouteService } from '@/route/services/saved-route.service';

type App = Parameters<typeof request>[0];
type TestAuthenticatedRequest = {
  user: {
    id: string;
  };
};

describe('SavedRouteController (e2e)', () => {
  let app: INestApplication;
  const savedRouteRepository = {
    findListByUserId: jest.fn(),
    findDetailByRouteId: jest.fn(),
  };
  const routeService = {
    getRecommendedRouteDetail: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SavedRouteController],
      providers: [
        SavedRouteService,
        { provide: SavedRouteRepository, useValue: savedRouteRepository },
        { provide: RouteService, useValue: routeService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context
            .switchToHttp()
            .getRequest<TestAuthenticatedRequest>();
          request.user = { id: 'user-1' };

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  beforeEach(() => {
    savedRouteRepository.findListByUserId.mockReset();
    savedRouteRepository.findDetailByRouteId.mockReset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 400 for empty routeId in GET /saved-routes/:routeId', async () => {
    await request(app.getHttpServer() as App)
      .get('/api/v1/saved-routes/%20')
      .expect(400);

    expect(savedRouteRepository.findDetailByRouteId).not.toHaveBeenCalled();
  });

  it('returns 200 and saved route list payload for GET /saved-routes', async () => {
    savedRouteRepository.findListByUserId.mockResolvedValue([
      {
        savedAt: new Date('2026-07-24T10:00:00.000Z'),
        route: {
          id: 'route-1',
          name: '부산 해운대 감성 산책 코스',
          totalDistanceMeters: 4200,
          estimatedSavingsWon: 3500,
          stops: [
            {
              orderIndex: 0,
              transitType: TransitType.BUS,
              travelMinutesFromPrev: 20,
              stayMinutes: 40,
              fareWon: 1500,
              estimatedPriceWon: 5000,
            },
            {
              orderIndex: 1,
              transitType: TransitType.WALKING,
              travelMinutesFromPrev: 10,
              stayMinutes: 40,
              fareWon: 0,
              estimatedPriceWon: 6000,
            },
          ],
          tripLogs: [{ isCompleted: true }],
        },
      },
    ]);

    await request(app.getHttpServer() as App)
      .get('/api/v1/saved-routes')
      .expect(200)
      .expect({
        savedRouteCount: 1,
        totalSavedSavingsWon: 3500,
        savedRoutes: [
          {
            routeId: 'route-1',
            routeName: '부산 해운대 감성 산책 코스',
            savedAt: '2026-07-24T10:00:00.000Z',
            isCompleted: true,
            stopCount: 2,
            totalDistanceKm: 4.2,
            transitTypes: ['BUS', 'WALKING'],
            totalCost: 12500,
            totalTimeMinutes: 110,
            estimatedSavingsWon: 3500,
          },
        ],
      });

    expect(savedRouteRepository.findListByUserId).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('returns 200 and detail payload for GET /saved-routes/:routeId', async () => {
    savedRouteRepository.findDetailByRouteId.mockResolvedValue({
      savedAt: new Date('2026-07-24T10:00:00.000Z'),
      route: {
        id: 'route-1',
        name: '부산 해운대 감성 산책 코스',
        totalDistanceMeters: 4200,
        estimatedSavingsWon: 3500,
        score: 4.8,
        routeType: RouteType.RECOMMENDED,
        congestionLevel: CongestionLevel.MEDIUM,
        stops: [
          {
            orderIndex: 0,
            transitType: TransitType.BUS,
            travelMinutesFromPrev: 20,
            stayMinutes: 40,
            fareWon: 1500,
            estimatedPriceWon: 5000,
            place: {
              name: '해운대 해수욕장',
              category: PlaceCategory.NATURE,
              openTime: '00:00',
              closeTime: '24:00',
              latitude: 35.1587,
              longitude: 129.1604,
            },
          },
        ],
        tripLogs: [{ isCompleted: true }],
      },
    });

    await request(app.getHttpServer() as App)
      .get('/api/v1/saved-routes/route-1')
      .expect(200)
      .expect({
        routeId: 'route-1',
        routeName: '부산 해운대 감성 산책 코스',
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
        totalCost: 6500,
        totalTimeMinutes: 60,
        totalTimeDisplay: '1h 0m',
        metaCost: { transportCost: 1500, placeCost: 5000 },
        metaTime: { pureTravelTime: 20, stayTime: 40 },
        estimatedSavingsWon: 3500,
        stops: [
          {
            sequence: 0,
            dayNumber: 1,
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
      });

    expect(savedRouteRepository.findDetailByRouteId).toHaveBeenCalledWith(
      'route-1',
      'user-1',
    );
  });
});
