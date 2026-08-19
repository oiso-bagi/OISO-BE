import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import {
  AdminRouteDetailResponseDto,
  CreateAdminRouteDto,
  UpdateAdminRouteDto,
} from '@/admin/dto/admin-route-builder.dto';

const applyAdminAuthDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiUnauthorizedResponse({
      description:
        '인증 토큰이 유효하지 않거나 권한이 없습니다 (401 Unauthorized)',
    }),
  );

export const ApiCreateAdminRouteDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '마스터 추천 코스 신규 등록 (관리자)',
      description:
        '어드민 코스 빌더를 통해 새로운 추천 코스 및 경유 장소(sequence 0부터 시작) 목록을 작성하여 등록합니다.',
    }),
    ApiBody({ type: CreateAdminRouteDto }),
    ApiCreatedResponse({
      description: '신규 등록된 마스터 코스 상세 객체 반환',
      type: AdminRouteDetailResponseDto,
    }),
    ApiBadRequestResponse({
      description: '경유 장소 미입력, sequence 순서 불일치, 또는 일수 초과',
    }),
    ApiNotFoundResponse({ description: '지정한 장소가 존재하지 않음' }),
  );

export const ApiGetAdminRouteDetailDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '코스 수정 폼 상세 조회 (관리자)',
      description:
        '선택한 코스의 전체 상세 정보 및 경유 장소(stops) 패키지 전체를 수정 폼 형태로 조회합니다.',
    }),
    ApiParam({
      name: 'routeId',
      description: '상세 조회할 코스 ID',
      example: 'route-03b77f38aa146d15',
    }),
    ApiOkResponse({
      description: '추천 코스 상세 객체 반환',
      type: AdminRouteDetailResponseDto,
    }),
    ApiNotFoundResponse({ description: '해당 추천 코스를 찾을 수 없음' }),
  );

export const ApiUpdateAdminRouteDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '마스터 추천 코스 수정 (관리자)',
      description:
        '선택한 코스의 이름, 테마, 게시 상태 및 경유 장소(sequence 0부터 시작) 목록 전체를 수정/갱신합니다.',
    }),
    ApiParam({
      name: 'routeId',
      description: '수정할 코스 ID',
      example: 'route-03b77f38aa146d15',
    }),
    ApiBody({ type: UpdateAdminRouteDto }),
    ApiOkResponse({
      description: '수정 완료된 마스터 코스 상세 객체 반환',
      type: AdminRouteDetailResponseDto,
    }),
    ApiBadRequestResponse({
      description: '경유 장소 미입력, sequence 순서 불일치, 또는 일수 초과',
    }),
    ApiNotFoundResponse({
      description: '해당 추천 코스 또는 지정 장소가 존재하지 않음',
    }),
  );
