import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * AdminRouteBuilderController E2E 테스트
 *
 * - 미인증 describe: 실제 AuthGuard를 사용하여 401 동작 검증
 * - 인증된 describe: AuthGuard를 mock으로 우회, PrismaService를 mock으로 대체
 *   → 실제 DB/JWT 없이 성공 플로우 및 오류 케이스 검증
 */
describe('AdminRouteBuilderController (e2e)', () => {
  // ─── 미인증 케이스: AuthGuard 실제 동작 ───────────────────────────────
  describe('미인증 요청 (401)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
      );
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('POST /api/v1/admin/routes — 인증 없이 401을 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/routes')
        .send({ name: '미인증', themeSlug: 'local-food', stops: [] })
        .expect(401);
    });

    it('GET /api/v1/admin/routes/:routeId — 인증 없이 401을 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/routes/some-id')
        .expect(401);
    });

    it('PUT /api/v1/admin/routes/:routeId — 인증 없이 401을 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/admin/routes/some-id')
        .send({ name: '미인증', themeSlug: 'local-food', stops: [] })
        .expect(401);
    });
  });

  describe('관리자 권한 인가 요청 (AuthGuard mock + real RolesGuard)', () => {
    let app: INestApplication<App>;
    let currentRole: UserRole;
    let routeFindUnique: jest.Mock;

    const MOCK_ROUTE_ID = 'route-role-check';
    const MOCK_PLACE_ID = 'place-role-check';

    const mockRouteDetailRow = {
      id: MOCK_ROUTE_ID,
      name: '권한 검증 코스',
      description: null,
      isPublished: true,
      totalDistanceMeters: 1200,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      themes: [{ theme: { slug: 'local-food', name: '부산 로컬 맛집' } }],
      stops: [
        {
          orderIndex: 0,
          stayMinutes: 60,
          travelMinutesFromPrev: null,
          transitType: null,
          place: {
            id: MOCK_PLACE_ID,
            name: '권한 검증 장소',
            address: '부산 해운대구',
            category: 'FOOD',
            latitude: new Prisma.Decimal('35.1532'),
            longitude: new Prisma.Decimal('129.1187'),
          },
        },
      ],
    };

    beforeAll(async () => {
      currentRole = UserRole.USER;
      routeFindUnique = jest.fn();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: (context: ExecutionContext) => {
            const request = context.switchToHttp().getRequest<{
              user?: { id: string; role: UserRole };
            }>();

            request.user = { id: 'mock-user-id', role: currentRole };

            return true;
          },
        })
        .overrideProvider(PrismaService)
        .useValue({
          onModuleInit: jest.fn(),
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          route: {
            findUnique: routeFindUnique,
            findFirst: jest.fn().mockResolvedValue(null),
            aggregate: jest.fn().mockResolvedValue({
              _sum: { estimatedSavingsWon: 0 },
              _avg: { localContributionScore: null },
            }),
          },
          place: {
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
          },
          routeStop: { groupBy: jest.fn().mockResolvedValue([]) },
          savedRoute: {
            count: jest.fn().mockResolvedValue(0),
            findMany: jest.fn().mockResolvedValue([]),
          },
          user: { count: jest.fn().mockResolvedValue(0) },
        })
        .compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
      );
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      currentRole = UserRole.USER;
      routeFindUnique.mockReset();
    });

    it('USER 권한이면 403 Forbidden을 반환한다', async () => {
      currentRole = UserRole.USER;

      await request(app.getHttpServer())
        .get(`/api/v1/admin/routes/${MOCK_ROUTE_ID}`)
        .expect(403);

      expect(routeFindUnique).not.toHaveBeenCalled();
    });

    it('ADMIN 권한이면 요청을 통과시켜 관리자 API 응답을 반환한다', async () => {
      currentRole = UserRole.ADMIN;
      routeFindUnique.mockResolvedValue(mockRouteDetailRow);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/routes/${MOCK_ROUTE_ID}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: MOCK_ROUTE_ID,
        name: '권한 검증 코스',
        themeSlug: 'local-food',
        isPublished: true,
      });
      expect(routeFindUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 인증된 관리자 케이스: AuthGuard + Prisma mock ─────────────────────
  describe('인증된 관리자 요청 (AuthGuard + Prisma mock)', () => {
    let app: INestApplication<App>;

    const MOCK_THEME_ID = 'theme-id-001';
    const MOCK_ROUTE_ID = 'route-abc123';
    const MOCK_PLACE_ID = 'place-x01';

    const mockRouteDetailRow = {
      id: MOCK_ROUTE_ID,
      name: '테스트 코스',
      description: null,
      isPublished: true,
      totalDistanceMeters: 1200,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      themes: [{ theme: { slug: 'local-food', name: '부산 로컬 맛집' } }],
      stops: [
        {
          orderIndex: 0,
          stayMinutes: 60,
          travelMinutesFromPrev: null,
          transitType: null,
          place: {
            id: MOCK_PLACE_ID,
            name: '테스트 장소',
            address: '부산 해운대구',
            category: 'FOOD',
            latitude: new Prisma.Decimal('35.1532'),
            longitude: new Prisma.Decimal('129.1187'),
          },
        },
      ],
    };

    const mockPlaceRow = {
      id: MOCK_PLACE_ID,
      latitude: new Prisma.Decimal('35.1532'),
      longitude: new Prisma.Decimal('129.1187'),
    };

    let themeFindUnique: jest.Mock;
    let placeFindMany: jest.Mock;
    let routeFindUnique: jest.Mock;
    let prismaTransaction: jest.Mock;

    beforeAll(async () => {
      themeFindUnique = jest.fn();
      placeFindMany = jest.fn();
      routeFindUnique = jest.fn();
      prismaTransaction = jest.fn();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: (context: ExecutionContext) => {
            const request = context.switchToHttp().getRequest<{
              user?: { id: string; role: UserRole };
            }>();

            request.user = { id: 'mock-admin-id', role: UserRole.ADMIN };

            return true;
          },
        })
        .overrideProvider(PrismaService)
        .useValue({
          onModuleInit: jest.fn(),
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          $transaction: prismaTransaction,
          theme: { findUnique: themeFindUnique },
          place: {
            findMany: placeFindMany,
            findUnique: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
          },
          route: {
            findUnique: routeFindUnique,
            findFirst: jest.fn().mockResolvedValue(null),
            aggregate: jest.fn().mockResolvedValue({
              _sum: { estimatedSavingsWon: 0 },
              _avg: { localContributionScore: null },
            }),
          },
          routeStop: { groupBy: jest.fn().mockResolvedValue([]) },
          savedRoute: {
            count: jest.fn().mockResolvedValue(0),
            findMany: jest.fn().mockResolvedValue([]),
          },
          user: { count: jest.fn().mockResolvedValue(0) },
        })
        .compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
      );
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ── POST /admin/routes ─────────────────────────────────────
    describe('POST /api/v1/admin/routes', () => {
      it('정상 요청 시 201과 생성된 코스 상세를 반환해야 한다', async () => {
        themeFindUnique.mockResolvedValue({ id: MOCK_THEME_ID });
        placeFindMany.mockResolvedValue([mockPlaceRow]);
        prismaTransaction.mockImplementation(
          async (fn: (tx: Record<string, jest.Mock>) => Promise<string>) =>
            fn({
              route: {
                create: jest.fn().mockResolvedValue({ id: MOCK_ROUTE_ID }),
              },
              routeTheme: { create: jest.fn().mockResolvedValue({}) },
              routeStop: { createMany: jest.fn().mockResolvedValue({}) },
            }),
        );
        routeFindUnique.mockResolvedValue(mockRouteDetailRow);

        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/routes')
          .send({
            name: '테스트 코스',
            themeSlug: 'local-food',
            isPublished: true,
            stops: [
              { placeId: MOCK_PLACE_ID, sequence: 0, stayTimeMinutes: 60 },
            ],
          })
          .expect(201);

        expect(response.body).toMatchObject({
          id: MOCK_ROUTE_ID,
          name: '테스트 코스',
          themeSlug: 'local-food',
          durationDays: 1,
          isPublished: true,
        });
        const body = response.body as {
          stops: Array<{
            placeId: string;
            dayNumber: number;
            sequence: number;
          }>;
        };
        expect(body.stops).toHaveLength(1);
        expect(body.stops[0]).toMatchObject({
          placeId: MOCK_PLACE_ID,
          dayNumber: 1,
          sequence: 0,
        });
      });

      it('stops가 비어있으면 400을 반환해야 한다', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/admin/routes')
          .send({
            name: '빈 stops 코스',
            themeSlug: 'local-food',
            isPublished: true,
            stops: [],
          })
          .expect(400);
      });

      it('sequence가 0부터 연속되지 않으면 400을 반환해야 한다', async () => {
        themeFindUnique.mockResolvedValue({ id: MOCK_THEME_ID });
        placeFindMany.mockResolvedValue([mockPlaceRow]);

        await request(app.getHttpServer())
          .post('/api/v1/admin/routes')
          .send({
            name: '잘못된 sequence 코스',
            themeSlug: 'local-food',
            isPublished: true,
            stops: [
              { placeId: MOCK_PLACE_ID, sequence: 1, stayTimeMinutes: 60 },
            ],
          })
          .expect(400);
      });

      it('존재하지 않는 placeId가 포함되면 400을 반환해야 한다', async () => {
        themeFindUnique.mockResolvedValue({ id: MOCK_THEME_ID });
        placeFindMany.mockResolvedValue([]);

        await request(app.getHttpServer())
          .post('/api/v1/admin/routes')
          .send({
            name: '없는 장소 코스',
            themeSlug: 'local-food',
            isPublished: true,
            stops: [
              { placeId: 'invalid-place-id', sequence: 0, stayTimeMinutes: 60 },
            ],
          })
          .expect(400);
      });
    });

    // ── GET /admin/routes/:routeId ─────────────────────────────
    describe('GET /api/v1/admin/routes/:routeId', () => {
      it('존재하는 routeId로 요청 시 200과 코스 상세를 반환해야 한다', async () => {
        routeFindUnique.mockResolvedValue(mockRouteDetailRow);

        const response = await request(app.getHttpServer())
          .get(`/api/v1/admin/routes/${MOCK_ROUTE_ID}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: MOCK_ROUTE_ID,
          name: '테스트 코스',
          themeSlug: 'local-food',
          durationDays: 1,
          stopCount: 1,
          isPublished: true,
        });

        const body = response.body as {
          stops: Array<{ latitude: number; longitude: number }>;
        };
        expect(body.stops[0].latitude).toBe(35.1532);
        expect(body.stops[0].longitude).toBe(129.1187);
      });

      it('존재하지 않는 routeId로 요청 시 404를 반환해야 한다', async () => {
        routeFindUnique.mockResolvedValue(null);

        await request(app.getHttpServer())
          .get('/api/v1/admin/routes/nonexistent-route-id')
          .expect(404);
      });
    });

    // ── PUT /admin/routes/:routeId ─────────────────────────────
    describe('PUT /api/v1/admin/routes/:routeId', () => {
      it('정상 요청 시 200과 수정된 코스 상세를 반환해야 한다', async () => {
        const updatedRow = { ...mockRouteDetailRow, name: '수정된 코스' };

        routeFindUnique
          .mockResolvedValueOnce(mockRouteDetailRow) // 존재 확인
          .mockResolvedValueOnce(updatedRow); // 수정 후 조회

        themeFindUnique.mockResolvedValue({ id: MOCK_THEME_ID });
        placeFindMany.mockResolvedValue([mockPlaceRow]);
        prismaTransaction.mockImplementation(
          async (fn: (tx: Record<string, jest.Mock>) => Promise<void>) =>
            fn({
              route: { update: jest.fn().mockResolvedValue({}) },
              routeTheme: {
                deleteMany: jest.fn().mockResolvedValue({}),
                create: jest.fn().mockResolvedValue({}),
              },
              routeStop: {
                deleteMany: jest.fn().mockResolvedValue({}),
                createMany: jest.fn().mockResolvedValue({}),
              },
            }),
        );

        const response = await request(app.getHttpServer())
          .put(`/api/v1/admin/routes/${MOCK_ROUTE_ID}`)
          .send({
            name: '수정된 코스',
            themeSlug: 'local-food',
            isPublished: true,
            stops: [
              { placeId: MOCK_PLACE_ID, sequence: 0, stayTimeMinutes: 60 },
            ],
          })
          .expect(200);

        expect(response.body).toMatchObject({
          id: MOCK_ROUTE_ID,
          name: '수정된 코스',
          durationDays: 1,
        });
      });

      it('존재하지 않는 routeId로 수정 요청 시 404를 반환해야 한다', async () => {
        routeFindUnique.mockResolvedValue(null);

        await request(app.getHttpServer())
          .put('/api/v1/admin/routes/nonexistent-route-id')
          .send({
            name: '수정 시도',
            themeSlug: 'local-food',
            isPublished: true,
            stops: [
              { placeId: MOCK_PLACE_ID, sequence: 0, stayTimeMinutes: 60 },
            ],
          })
          .expect(404);
      });
    });
  });
});
