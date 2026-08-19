import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

describe('AdminUserController (e2e)', () => {
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

  it('GET /api/v1/admin/users returns 401 without auth', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
  });

  it('PATCH /api/v1/admin/users/:userId/active returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/user-id/active')
      .send({ isActive: false })
      .expect(401);
  });

  it('PATCH /api/v1/admin/users/:userId/role returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/user-id/role')
      .send({ role: 'ADMIN' })
      .expect(401);
  });
});
