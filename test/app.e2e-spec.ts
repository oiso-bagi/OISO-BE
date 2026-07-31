import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

type RecommendationOptionsBody = {
  travelStyles: { slug: string }[];
  durationDays: number[];
  budgetAllocation: {
    defaultDailyBudgetWon: number;
  };
};

type RecommendedRouteBody = {
  id: string;
  name: string;
  estimatedSavingsWon: number;
  isRecommended: boolean;
}[];

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const routeFindMany = jest.fn();

  beforeEach(async () => {
    routeFindMany.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        route: {
          findMany: routeFindMany,
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('returns recommendation options for GET /api/v1/recommended-routes/recommend/options', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/recommended-routes/recommend/options')
      .expect(200);
    const responseBody = response.body as RecommendationOptionsBody;

    expect(responseBody).toMatchObject({
      durationDays: [1, 2, 3, 4, 5],
      budgetAllocation: {
        defaultDailyBudgetWon: 60000,
      },
    });
    expect(responseBody.travelStyles[0]).toMatchObject({
      slug: 'local-food',
    });
  });

  it('returns recommendations for POST /api/v1/recommended-routes/recommend with valid input', async () => {
    routeFindMany.mockResolvedValue([
      {
        id: 'route-1',
        name: 'Budget route',
        totalDistanceMeters: 1200,
        estimatedSavingsWon: 5000,
        score: 4.5,
        routeType: 'RECOMMENDED',
        congestionLevel: 'LOW',
        stops: [],
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/v1/recommended-routes/recommend')
      .send({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 60000,
      })
      .expect(200);
    const responseBody = response.body as RecommendedRouteBody;

    expect(responseBody).toHaveLength(1);
    expect(responseBody[0]).toMatchObject({
      id: 'route-1',
      name: 'Budget route',
      estimatedSavingsWon: 5000,
      isRecommended: true,
    });
    expect(routeFindMany).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for POST /api/v1/recommended-routes/recommend with invalid budget', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/recommended-routes/recommend')
      .send({
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 0,
      })
      .expect(400);

    expect(routeFindMany).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
