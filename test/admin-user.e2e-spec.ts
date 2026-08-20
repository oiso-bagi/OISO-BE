import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

type TransactionOperation = (tx: PrismaMock) => Promise<unknown>;

type PrismaMock = {
  onModuleInit: jest.Mock<Promise<void>, []>;
  onModuleDestroy: jest.Mock<Promise<void>, []>;
  $connect: jest.Mock<Promise<void>, []>;
  $disconnect: jest.Mock<Promise<void>, []>;
  $transaction: jest.Mock<
    Promise<unknown>,
    [operation: TransactionOperation, options?: unknown]
  >;
  user: {
    count: jest.Mock;
    findMany: jest.Mock<Promise<unknown[]>, [Prisma.UserFindManyArgs]>;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe('AdminUserController (e2e)', () => {
  describe('unauthenticated requests', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(createPrismaMock())
        .compile();

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

  describe('authenticated admin requests', () => {
    let app: INestApplication<App>;
    let currentRole: UserRole;
    let prismaMock: ReturnType<typeof createPrismaMock>;

    const userRow = createUserRow();

    beforeAll(async () => {
      currentRole = UserRole.ADMIN;
      prismaMock = createPrismaMock();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: (context: ExecutionContext) => {
            const request = context.switchToHttp().getRequest<{
              user?: { id: string; role: UserRole };
            }>();
            request.user = { id: 'admin-id', role: currentRole };

            return true;
          },
        })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

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

    beforeEach(() => {
      currentRole = UserRole.ADMIN;
      jest.clearAllMocks();
      prismaMock.$transaction.mockImplementation((operation) =>
        operation(prismaMock),
      );
    });

    it('returns a paginated user list for admins', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue([userRow]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ q: 'user', provider: 'google', role: 'USER' })
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        size: 20,
        totalCount: 1,
        totalPages: 1,
        items: [
          {
            id: 'user-id',
            email: 'user@example.com',
            nickname: 'user',
            provider: 'GOOGLE',
            role: UserRole.USER,
            isActive: true,
          },
        ],
      });
      const findManyArgs = prismaMock.user.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toMatchObject({ provider: 'GOOGLE' });
    });

    it('updates active status for admins', async () => {
      const updated = { ...userRow, isActive: false };
      prismaMock.user.findUnique.mockResolvedValue(userRow);
      prismaMock.user.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/user-id/active')
        .send({ isActive: false })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'user-id',
        isActive: false,
      });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('updates role for admins', async () => {
      const updated = { ...userRow, role: UserRole.ADMIN };
      prismaMock.user.findUnique.mockResolvedValue(userRow);
      prismaMock.user.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/user-id/role')
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'user-id',
        role: UserRole.ADMIN,
      });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns 403 for non-admin users', async () => {
      currentRole = UserRole.USER;

      await request(app.getHttpServer()).get('/api/v1/admin/users').expect(403);
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid active status bodies', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/user-id/active')
        .send({ isActive: 'no' })
        .expect(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid role bodies', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/user-id/role')
        .send({ role: 'OWNER' })
        .expect(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('returns 404 for nonexistent userId on mutation endpoints', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/missing-user/active')
        .send({ isActive: false })
        .expect(404);
    });
  });
});

function createPrismaMock(): PrismaMock {
  const mock = {
    onModuleInit: jest.fn<Promise<void>, []>(),
    onModuleDestroy: jest.fn<Promise<void>, []>(),
    $connect: jest.fn<Promise<void>, []>(),
    $disconnect: jest.fn<Promise<void>, []>(),
    $transaction: jest.fn<
      Promise<unknown>,
      [operation: TransactionOperation, options?: unknown]
    >(),
    user: {
      count: jest.fn(),
      findMany: jest.fn<Promise<unknown[]>, [Prisma.UserFindManyArgs]>(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } satisfies PrismaMock;

  mock.$transaction.mockImplementation((operation) => operation(mock));

  return mock;
}

function createUserRow(overrides = {}) {
  return {
    id: 'user-id',
    email: 'user@example.com',
    nickname: 'user',
    provider: 'GOOGLE',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}
