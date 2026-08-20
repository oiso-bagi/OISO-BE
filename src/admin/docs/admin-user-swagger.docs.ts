import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserProvider, UserRole } from '@prisma/client';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import {
  AdminToggleUserActiveDto,
  AdminUpdateUserRoleDto,
  AdminUserListItemDto,
  AdminUserPageResponseDto,
} from '@/admin/dto/admin-user.dto';

export const ApiAdminUserControllerDocs = () => ApiTags('관리자 회원');

const applyAdminAuthDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiUnauthorizedResponse({
      description: '인증 토큰이 없거나 유효하지 않거나 정지된 계정입니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 필요합니다.',
    }),
  );

export const ApiGetAdminUsersDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '회원 목록 조회',
      description:
        '이메일/닉네임 검색어와 provider, isActive, role 필터를 적용해 회원 목록을 페이지네이션으로 조회합니다.',
    }),
    ApiQuery({ name: 'page', required: false, description: '페이지 번호' }),
    ApiQuery({
      name: 'size',
      required: false,
      description: '페이지당 항목 수',
    }),
    ApiQuery({
      name: 'q',
      required: false,
      description: '이메일 또는 닉네임 검색어',
    }),
    ApiQuery({
      name: 'provider',
      required: false,
      description: '가입 또는 로그인 제공자 필터',
      enum: UserProvider,
      example: 'GOOGLE',
    }),
    ApiQuery({
      name: 'isActive',
      required: false,
      description: '계정 활성 상태 필터 (true/false)',
    }),
    ApiQuery({
      name: 'role',
      required: false,
      enum: UserRole,
      description: '회원 권한 필터',
    }),
    ApiOkResponse({
      description: '회원 목록 및 페이지네이션 정보',
      type: AdminUserPageResponseDto,
    }),
  );

export const ApiToggleAdminUserActiveDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '계정 정지/복구 상태 변경',
      description:
        '선택한 회원의 계정 활성 상태를 변경합니다. 마지막 활성 관리자는 정지할 수 없습니다.',
    }),
    ApiParam({
      name: 'userId',
      description: '상태를 변경할 회원 ID',
      example: 'cm1234567890',
    }),
    ApiBody({ type: AdminToggleUserActiveDto }),
    ApiOkResponse({
      description: '상태가 변경된 회원 정보',
      type: AdminUserListItemDto,
    }),
    ApiNotFoundResponse({ description: '회원을 찾을 수 없습니다.' }),
    ApiConflictResponse({
      description: '마지막 활성 관리자는 정지할 수 없습니다.',
    }),
  );

export const ApiUpdateAdminUserRoleDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '관리자 권한 부여/해제',
      description:
        '선택한 회원의 권한을 변경합니다. 자기 자신의 권한 변경과 마지막 활성 관리자 권한 해제는 차단됩니다.',
    }),
    ApiParam({
      name: 'userId',
      description: '권한을 변경할 회원 ID',
      example: 'cm1234567890',
    }),
    ApiBody({ type: AdminUpdateUserRoleDto }),
    ApiOkResponse({
      description: '권한이 변경된 회원 정보',
      type: AdminUserListItemDto,
    }),
    ApiNotFoundResponse({ description: '회원을 찾을 수 없습니다.' }),
    ApiConflictResponse({
      description:
        '자기 자신의 권한 변경 또는 마지막 활성 관리자 권한 해제는 허용되지 않습니다.',
    }),
  );
