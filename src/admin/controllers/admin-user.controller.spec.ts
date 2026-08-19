/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AdminUserController } from '@/admin/controllers/admin-user.controller';
import { AdminUserService } from '@/admin/services/admin-user.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let service: jest.Mocked<AdminUserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [
        {
          provide: AdminUserService,
          useValue: {
            getUsers: jest.fn(),
            toggleUserActive: jest.fn(),
            updateUserRole: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminUserController>(AdminUserController);
    service = module.get(AdminUserService);
  });

  it('delegates user list queries to the service', async () => {
    const mockResult = {
      items: [],
      page: 1,
      size: 20,
      totalCount: 0,
      totalPages: 1,
    };
    service.getUsers.mockResolvedValue(mockResult);

    const query = { page: 1, size: 20, role: UserRole.USER };
    const result = await controller.getUsers(query);

    expect(service.getUsers).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockResult);
  });

  it('delegates active status changes to the service', async () => {
    const mockUser = createUser({ isActive: false });
    service.toggleUserActive.mockResolvedValue(mockUser);

    const body = { isActive: false };
    const result = await controller.toggleUserActive('user-id', body);

    expect(service.toggleUserActive).toHaveBeenCalledWith('user-id', body);
    expect(result).toEqual(mockUser);
  });

  it('passes the current admin id when changing roles', async () => {
    const mockUser = createUser({ role: UserRole.ADMIN });
    service.updateUserRole.mockResolvedValue(mockUser);

    const body = { role: UserRole.ADMIN };
    const result = await controller.updateUserRole(
      'user-id',
      createUser({ id: 'admin-id', role: UserRole.ADMIN }),
      body,
    );

    expect(service.updateUserRole).toHaveBeenCalledWith(
      'user-id',
      'admin-id',
      body,
    );
    expect(result).toEqual(mockUser);
  });
});

function createUser(overrides = {}) {
  return {
    id: 'user-id',
    email: 'user@example.com',
    nickname: 'user',
    provider: 'google',
    passwordHash: null,
    phone: null,
    role: UserRole.USER,
    birthDate: null,
    isActive: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}
