import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

describe('AdminContentController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
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

  describe('GET /api/v1/admin/routes', () => {
    it('인증 헤더 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/routes')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/places', () => {
    it('인증 헤더 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/places')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/admin/routes/:routeId/published', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/routes/invalid_id/published')
        .send({ isPublished: true })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/admin/places/:placeId/active', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/places/invalid_id/active')
        .send({ isActive: true })
        .expect(401);
    });
  });
});
