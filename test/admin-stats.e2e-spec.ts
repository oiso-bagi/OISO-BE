import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

describe('AdminStatsController (e2e)', () => {
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

  describe('GET /api/v1/admin/stats/overview', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/admin/stats/overview')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/stats/savings-breakdown', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/admin/stats/savings-breakdown')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/kto/status', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer()).get('/admin/kto/status').expect(401);
    });
  });

  describe('POST /api/v1/admin/kto/collect', () => {
    it('인증 없이 요청 시 401 Unauthorized를 반환해야 한다', async () => {
      await request(app.getHttpServer()).post('/admin/kto/collect').expect(401);
    });
  });
});
