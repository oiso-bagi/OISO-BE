import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import {
  ApiAdminUserControllerDocs,
  ApiGetAdminUsersDocs,
  ApiToggleAdminUserActiveDocs,
  ApiUpdateAdminUserRoleDocs,
} from '@/admin/docs/admin-user-swagger.docs';
import { AdminUserListQueryDto } from '@/admin/dto/admin-list-query.dto';
import {
  AdminToggleUserActiveDto,
  AdminUpdateUserRoleDto,
  AdminUserListItemDto,
} from '@/admin/dto/admin-user.dto';
import { AdminPageResponseDto } from '@/admin/dto/admin-page-response.dto';
import { AdminUserService } from '@/admin/services/admin-user.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiAdminUserControllerDocs()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get('users')
  @ApiGetAdminUsersDocs()
  async getUsers(
    @Query() query: AdminUserListQueryDto,
  ): Promise<AdminPageResponseDto<AdminUserListItemDto>> {
    return this.adminUserService.getUsers(query);
  }

  @Patch('users/:userId/active')
  @HttpCode(HttpStatus.OK)
  @ApiToggleAdminUserActiveDocs()
  async toggleUserActive(
    @Param('userId') userId: string,
    @Body() body: AdminToggleUserActiveDto,
  ): Promise<AdminUserListItemDto> {
    return this.adminUserService.toggleUserActive(userId, body);
  }

  @Patch('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateAdminUserRoleDocs()
  async updateUserRole(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
    @Body() body: AdminUpdateUserRoleDto,
  ): Promise<AdminUserListItemDto> {
    return this.adminUserService.updateUserRole(userId, currentUser.id, body);
  }
}
