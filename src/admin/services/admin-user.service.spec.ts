import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AdminUserRepository } from '@/admin/repositories/admin-user.repository';
import { AdminUserService } from '@/admin/services/admin-user.service';

describe('AdminUserService', () => {
  let service: AdminUserService;
  let repository: jest.Mocked<AdminUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        {
          provide: AdminUserRepository,
          useValue: {
            findUsers: jest.fn(),
            findById: jest.fn(),
            countActiveAdmins: jest.fn(),
            updateActiveStatus: jest.fn(),
            updateRole: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminUserService>(AdminUserService);
    repository = module.get(AdminUserRepository);
  });

  it('returns paginated users', async () => {
    const user = createUser();
    repository.findUsers.mockResolvedValue({
      items: [user],
      totalCount: 1,
    });

    const result = await service.getUsers({ page: 1, size: 20 });

    expect(result.items).toEqual([user]);
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('throws not found when toggling an unknown user', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.toggleUserActive('missing-id', { isActive: false }),
    ).rejects.toThrow(NotFoundException);
  });

  it('prevents deactivating the last active admin', async () => {
    repository.findById.mockResolvedValue(
      createUser({ role: UserRole.ADMIN, isActive: true }),
    );
    repository.countActiveAdmins.mockResolvedValue(1);

    await expect(
      service.toggleUserActive('admin-id', { isActive: false }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates active status when another active admin exists', async () => {
    const updated = createUser({ role: UserRole.ADMIN, isActive: false });
    repository.findById.mockResolvedValue(
      createUser({ role: UserRole.ADMIN, isActive: true }),
    );
    repository.countActiveAdmins.mockResolvedValue(2);
    repository.updateActiveStatus.mockResolvedValue(updated);

    await expect(
      service.toggleUserActive('admin-id', { isActive: false }),
    ).resolves.toEqual(updated);
  });

  it('prevents admins from changing their own role', async () => {
    repository.findById.mockResolvedValue(createUser({ role: UserRole.ADMIN }));

    await expect(
      service.updateUserRole('admin-id', 'admin-id', { role: UserRole.USER }),
    ).rejects.toThrow(ConflictException);
  });

  it('prevents demoting the last active admin', async () => {
    repository.findById.mockResolvedValue(
      createUser({ id: 'target-id', role: UserRole.ADMIN, isActive: true }),
    );
    repository.countActiveAdmins.mockResolvedValue(1);

    await expect(
      service.updateUserRole('target-id', 'admin-id', { role: UserRole.USER }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates a user role when guard conditions pass', async () => {
    const updated = createUser({ id: 'target-id', role: UserRole.ADMIN });
    repository.findById.mockResolvedValue(
      createUser({ id: 'target-id', role: UserRole.USER }),
    );
    repository.updateRole.mockResolvedValue(updated);

    await expect(
      service.updateUserRole('target-id', 'admin-id', {
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual(updated);
  });
});

function createUser(overrides = {}) {
  return {
    id: 'user-id',
    email: 'user@example.com',
    nickname: 'user',
    provider: 'google',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}
