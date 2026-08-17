import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import {
  AdminPlaceListItemDto,
  AdminPlacePageResponseDto,
  AdminRouteListItemDto,
  AdminRoutePageResponseDto,
} from '@/admin/dto/admin-page-response.dto';
import {
  AdminTogglePlaceActiveDto,
  AdminToggleRoutePublishedDto,
} from '@/admin/dto/admin-toggle.dto';

export const ApiAdminContentControllerDocs = () => ApiTags('Admin Content');

const applyAdminAuthDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiUnauthorizedResponse({
      description:
        '인증 토큰이 유효하지 않거나 권한이 없습니다 (401 Unauthorized)',
    }),
  );

export const ApiGetAdminRoutesDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '마스터 추천 코스 전체 목록 조회 (관리자)',
      description:
        '미게시(isPublished=false) 코스를 포함한 전체 추천 코스 목록을 페이지네이션 및 검색/필터 조건으로 조회합니다.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: '페이지 번호 (기본값: 1)',
    }),
    ApiQuery({
      name: 'size',
      required: false,
      description: '페이지당 항목 수 (기본값: 20)',
    }),
    ApiQuery({ name: 'q', required: false, description: '코스명 검색어' }),
    ApiQuery({
      name: 'theme',
      required: false,
      description:
        '테마 슬러그 (local-food: 부산 로컬 맛집 | emotion-cafe: 감성 카페 | beach-tour: 바다 관광 | photo-spot: 포토 스팟 | traditional-market: 전통시장 | nature-walk: 자연 / 산책)',
      example: 'local-food',
    }),
    ApiQuery({
      name: 'isPublished',
      required: false,
      description: '게시 여부 (true/false)',
    }),
    ApiOkResponse({
      description: '추천 코스 목록 및 페이지네이션 메타데이터 반환',
      type: AdminRoutePageResponseDto,
    }),
  );

export const ApiToggleAdminRoutePublishedDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '마스터 추천 코스 게시 토글 (관리자)',
      description:
        '선택한 코스의 게시 상태(isPublished: true/false)를 전환하고 변경된 코스 객체 전체를 반환합니다.',
    }),
    ApiParam({
      name: 'routeId',
      description: '게시 상태를 변경할 코스 ID',
      example: 'route-03b77f38aa146d15',
    }),
    ApiBody({ type: AdminToggleRoutePublishedDto }),
    ApiOkResponse({
      description: '변경된 추천 코스 객체 반환',
      type: AdminRouteListItemDto,
    }),
    ApiNotFoundResponse({ description: '해당 추천 코스를 찾을 수 없음' }),
  );

export const ApiGetAdminPlacesDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '장소 마스터 목록 조회 (관리자)',
      description:
        '비활성화(isActive=false)된 장소를 포함한 전체 장소 목록을 페이지네이션 및 카테고리/검색 필터로 조회합니다.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: '페이지 번호 (기본값: 1)',
    }),
    ApiQuery({
      name: 'size',
      required: false,
      description: '페이지당 항목 수 (기본값: 20)',
    }),
    ApiQuery({
      name: 'q',
      required: false,
      description: '장소명 또는 주소 검색어',
    }),
    ApiQuery({
      name: 'category',
      required: false,
      description:
        '장소 카테고리 (FOOD: 식당 | CAFE: 카페 | MARKET: 전통시장 | CULTURE: 문화 | NATURE: 자연 | EXPERIENCE: 체험 | VIEWPOINT: 전망대 | ETC: 기타)',
      example: 'FOOD',
    }),
    ApiQuery({
      name: 'isActive',
      required: false,
      description: '활성화 상태 여부 (true/false)',
    }),
    ApiOkResponse({
      description: '장소 목록 및 페이지네이션 메타데이터 반환',
      type: AdminPlacePageResponseDto,
    }),
  );

export const ApiToggleAdminPlaceActiveDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '장소 Soft Delete 토글 (관리자)',
      description:
        '선택한 장소의 활성화 상태(isActive: true/false)를 전환하고 변경된 장소 객체 전체를 반환합니다.',
    }),
    ApiParam({
      name: 'placeId',
      description: '상태를 변경할 장소 ID',
      example: 'place_001',
    }),
    ApiBody({ type: AdminTogglePlaceActiveDto }),
    ApiOkResponse({
      description: '변경된 장소 객체 반환',
      type: AdminPlaceListItemDto,
    }),
    ApiNotFoundResponse({ description: '해당 장소를 찾을 수 없음' }),
  );
