import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';
import { AdminPageResponseDto } from '@/admin/dto/admin-page-response.dto';

export class AdminUserListItemDto {
  @ApiProperty({ description: '회원 ID', example: 'cm1234567890' })
  id: string;

  @ApiProperty({ description: '회원 이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: '회원 닉네임', example: 'oiso_user' })
  nickname: string;

  @ApiProperty({ description: 'OAuth 제공자', example: 'google' })
  provider: string;

  @ApiProperty({
    description: '회원 권한',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({ description: '계정 활성 상태', example: true })
  isActive: boolean;

  @ApiProperty({
    description: '계정 생성 일시',
    example: '2026-08-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '계정 수정 일시',
    example: '2026-08-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class AdminUserPageResponseDto extends AdminPageResponseDto<AdminUserListItemDto> {
  @ApiProperty({
    type: [AdminUserListItemDto],
    description: '회원 목록 데이터',
  })
  declare items: AdminUserListItemDto[];
}

export class AdminToggleUserActiveDto {
  @ApiProperty({ description: '변경할 계정 활성 상태', example: false })
  @IsBoolean()
  isActive: boolean;
}

export class AdminUpdateUserRoleDto {
  @ApiProperty({
    description: '변경할 회원 권한',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  role: UserRole;
}
