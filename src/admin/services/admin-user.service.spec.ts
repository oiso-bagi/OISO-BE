import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import { AdminUserRepository } from '@/admin/repositories/admin-user.repository';
import { AdminUserService } from '@/admin/services/admin-user.service';

describe('AdminUserService', () => {
  let service: AdminUserService;
  let repository: jest.Mocked<AdminUserRepository>;
  const tx = { user: {} } as Prisma.TransactionClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        {
          provide: AdminUserRepository,
          useValue: {
            findUsers: jest.fn(),
            runInSerializableTransaction: jest.fn(),
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
    repository.runInSerializableTransaction.mockImplementation((operation) =>
      operation(tx),
    );
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
    expect(repository.findById).toHaveBeenCalledWith('missing-id', tx);
  });

  it('prevents deactivating the last active admin', async () => {
    repository.findById.mockResolvedValue(
      createUser({ role: UserRole.ADMIN, isActive: true }),
    );
    repository.countActiveAdmins.mockResolvedValue(1);

    await expect(
      service.toggleUserActive('admin-id', { isActive: false }),
    ).rejects.toThrow(ConflictException);
    expect(repository.countActiveAdmins).toHaveBeenCalledWith(tx);
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
    expect(repository.updateActiveStatus).toHaveBeenCalledWith(
      'admin-id',
      false,
      tx,
    );
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
    expect(repository.updateRole).toHaveBeenCalledWith(
      'target-id',
      UserRole.ADMIN,
      tx,
    );
  });

  it('retries serialization failures once before applying the update', async () => {
    const updated = createUser({ isActive: false });
    repository.runInSerializableTransaction
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('write conflict', {
          code: 'P2034',
          clientVersion: '5.22.0',
        }),
      )
      .mockImplementationOnce((operation) => operation(tx));
    repository.findById.mockResolvedValue(createUser());
    repository.updateActiveStatus.mockResolvedValue(updated);

    await expect(
      service.toggleUserActive('user-id', { isActive: false }),
    ).resolves.toEqual(updated);

    expect(repository.runInSerializableTransaction).toHaveBeenCalledTimes(2);
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
