import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
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
    const existing = await this.findExistingUser(userId);

    if (
      existing.role === UserRole.ADMIN &&
      existing.isActive &&
      !body.isActive
    ) {
      await this.assertAnotherActiveAdminExists();
    }

    return this.adminUserRepository.updateActiveStatus(userId, body.isActive);
  }

  async updateUserRole(
    userId: string,
    currentUserId: string,
    body: AdminUpdateUserRoleDto,
  ): Promise<AdminUserListItemDto> {
    const existing = await this.findExistingUser(userId);

    if (userId === currentUserId) {
      throw new ConflictException('Admins cannot change their own role.');
    }

    if (
      existing.role === UserRole.ADMIN &&
      existing.isActive &&
      body.role !== UserRole.ADMIN
    ) {
      await this.assertAnotherActiveAdminExists();
    }

    return this.adminUserRepository.updateRole(userId, body.role);
  }

  private async findExistingUser(
    userId: string,
  ): Promise<AdminUserListItemDto> {
    const existing = await this.adminUserRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    return existing;
  }

  private async assertAnotherActiveAdminExists(): Promise<void> {
    const activeAdminCount = await this.adminUserRepository.countActiveAdmins();

    if (activeAdminCount <= 1) {
      throw new ConflictException('At least one active admin is required.');
    }
  }
}
