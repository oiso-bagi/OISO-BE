import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AdminUserListQueryDto } from '@/admin/dto/admin-list-query.dto';
import {
  AdminToggleUserActiveDto,
  AdminUpdateUserRoleDto,
  AdminUserListItemDto,
} from '@/admin/dto/admin-user.dto';
import { AdminPageResponseDto } from '@/admin/dto/admin-page-response.dto';
import { AdminUserRepository } from '@/admin/repositories/admin-user.repository';

@Injectable()
export class AdminUserService {
  constructor(private readonly adminUserRepository: AdminUserRepository) {}

  async getUsers(
    query: AdminUserListQueryDto,
  ): Promise<AdminPageResponseDto<AdminUserListItemDto>> {
    const { items, totalCount } =
      await this.adminUserRepository.findUsers(query);
    return AdminPageResponseDto.of(items, query.page, query.size, totalCount);
  }

  async toggleUserActive(
    userId: string,
    body: AdminToggleUserActiveDto,
  ): Promise<AdminUserListItemDto> {
    return this.runUserMutationInTransaction(async (tx) => {
      const existing = await this.findExistingUser(userId, tx);

      if (
        existing.role === UserRole.ADMIN &&
        existing.isActive &&
        !body.isActive
      ) {
        await this.assertAnotherActiveAdminExists(tx);
      }

      return this.adminUserRepository.updateActiveStatus(
        userId,
        body.isActive,
        tx,
      );
    });
  }

  async updateUserRole(
    userId: string,
    currentUserId: string,
    body: AdminUpdateUserRoleDto,
  ): Promise<AdminUserListItemDto> {
    return this.runUserMutationInTransaction(async (tx) => {
      const existing = await this.findExistingUser(userId, tx);

      if (userId === currentUserId) {
        throw new ConflictException('Admins cannot change their own role.');
      }

      if (
        existing.role === UserRole.ADMIN &&
        existing.isActive &&
        body.role !== UserRole.ADMIN
      ) {
        await this.assertAnotherActiveAdminExists(tx);
      }

      return this.adminUserRepository.updateRole(userId, body.role, tx);
    });
  }

  private async findExistingUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AdminUserListItemDto> {
    const existing = await this.adminUserRepository.findById(userId, tx);
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    return existing;
  }

  private async assertAnotherActiveAdminExists(
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const activeAdminCount =
      await this.adminUserRepository.countActiveAdmins(tx);

    if (activeAdminCount <= 1) {
      throw new ConflictException('At least one active admin is required.');
    }
  }

  private async runUserMutationInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.adminUserRepository.runInSerializableTransaction(
          operation,
        );
      } catch (error) {
        if (!this.isSerializationFailure(error)) {
          throw error;
        }

        if (attempt === maxAttempts) {
          throw new ConflictException(
            'Concurrent admin user update conflict. Please retry.',
          );
        }
      }
    }

    throw new ConflictException(
      'Concurrent admin user update conflict. Please retry.',
    );
  }

  private isSerializationFailure(error: unknown): boolean {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return true;
    }

    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes('could not serialize access') ||
      error.message.includes('Serialization failure')
    );
  }
}
