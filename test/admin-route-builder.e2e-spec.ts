import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

describe('AdminRouteBuilderController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/admin/routes', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .post('/admin/routes')
        .send({
          name: '미인증 테스트 코스',
          themeSlug: 'local-food',
          durationDays: 1,
          isPublished: true,
          stops: [],
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/routes/:routeId', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/admin/routes/invalid_id')
        .expect(401);
    });
  });

  describe('PUT /api/v1/admin/routes/:routeId', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .put('/admin/routes/invalid_id')
        .send({
          name: '미인증 수정 테스트 코스',
          themeSlug: 'local-food',
          durationDays: 1,
          isPublished: true,
          stops: [],
        })
        .expect(401);
    });
  });
});
