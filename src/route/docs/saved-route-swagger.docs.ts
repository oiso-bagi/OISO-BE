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
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import {
  ApiAccessTokenUnauthorizedResponseDocs,
  ApiJwtAccessTokenInternalServerErrorResponseDocs,
  createCommonErrorExample,
} from '@/common/docs/auth-error-swagger.docs';
import { CreateSavedRouteDto } from '@/route/dto/create-saved-route.dto';
import { SaveRouteResponseDto } from '@/route/dto/save-route-response.dto';
import { SavedRouteCompletionResponseDto } from '@/route/dto/saved-route-completion-response.dto';
import { SavedRouteDetailResponseDto } from '@/route/dto/saved-route-detail-response.dto';
import { SavedRouteListResponseDto } from '@/route/dto/saved-route-list-response.dto';
import { ToggleSavedRouteCompletionDto } from '@/route/dto/toggle-saved-route-completion.dto';

const savedRouteBadRequestExamples = {
  invalidUserId: {
    summary: '사용자 ID 없음',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/saved-routes',
      method: 'GET',
      message: '사용자 ID는 비어 있을 수 없습니다.',
      error: 'Bad Request',
    }),
  },
  emptyRouteId: {
    summary: '저장 루트 ID 공백',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/saved-routes/%20',
      method: 'GET',
      message: '저장된 루트 ID는 비어 있을 수 없습니다.',
      error: 'Bad Request',
    }),
  },
};

const savedRouteNotFoundExamples = {
  savedRouteNotFound: {
    summary: '저장 루트 없음',
    value: createCommonErrorExample({
      statusCode: 404,
      path: '/api/v1/saved-routes/route_999',
      method: 'GET',
      message: '저장된 루트를 찾을 수 없습니다.',
      error: 'Not Found',
    }),
  },
};

export const ApiSavedRouteControllerDocs = () => ApiTags('Saved Route');

const applySavedRouteAuthDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiAccessTokenUnauthorizedResponseDocs(),
  );

export const ApiGetSavedRouteListDocs = () =>
  applyDecorators(
    applySavedRouteAuthDocs(),
    ApiOperation({
      summary: '저장 루트 목록 조회',
      description: [
        '현재 로그인한 사용자의 저장 루트 목록과 절약 금액 합계를 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 우선 사용합니다.',
        '2. Bearer 토큰이 없으면 액세스 토큰 쿠키를 사용합니다.',
        '3. 인증에 성공한 사용자의 user.id 기준으로 저장 루트를 조회합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description: '저장 루트 개수, 총 절약 금액, 저장 루트 목록을 반환합니다.',
      type: SavedRouteListResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        '인증된 사용자 ID가 비어 있으면 400 응답을 반환할 수 있습니다.',
      content: {
        'application/json': {
          examples: {
            invalidUserId: savedRouteBadRequestExamples.invalidUserId,
          },
        },
      },
    }),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 저장 루트 목록 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    ),
  );

export const ApiGetSavedRouteDetailDocs = () =>
  applyDecorators(
    applySavedRouteAuthDocs(),
    ApiOperation({
      summary: '저장 루트 상세 조회',
      description: [
        '현재 로그인한 사용자가 저장한 루트의 상세 정보와 경유지 목록을 조회합니다.',
        '',
        '요청 파라미터:',
        '- routeId: 저장 루트 ID',
        '요청 바디: 없음',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 우선 사용합니다.',
        '2. Bearer 토큰이 없으면 액세스 토큰 쿠키를 사용합니다.',
        '3. 인증에 성공한 사용자의 user.id 기준으로 저장 여부를 확인합니다.',
      ].join('\n'),
    }),
    ApiParam({
      name: 'routeId',
      description: '조회할 저장 루트 ID',
      example: 'route_001',
    }),
    ApiOkResponse({
      description: '저장 루트 상세 정보와 경유지 목록을 반환합니다.',
      type: SavedRouteDetailResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        '사용자 ID 또는 저장 루트 ID가 비어 있으면 400 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: savedRouteBadRequestExamples,
        },
      },
    }),
    ApiNotFoundResponse({
      description:
        '해당 사용자의 저장 루트가 존재하지 않으면 404 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: savedRouteNotFoundExamples,
        },
      },
    }),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 저장 루트 상세 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    ),
  );

export const ApiSaveRouteDocs = () =>
  applyDecorators(
    applySavedRouteAuthDocs(),
    ApiOperation({
      summary: '추천 루트 보관함 저장 API',
      description:
        '선택한 추천 루트를 유저의 보관함(SavedRoute)에 저장합니다. 신규 저장 시 created: true, 이미 저장되어 있는 경우 멱등성 유지와 함께 created: false를 반환합니다.',
    }),
    ApiBody({ type: CreateSavedRouteDto }),
    ApiCreatedResponse({
      description:
        '보관함 저장 요청이 성공적으로 처리되었습니다. (신규 생성 시 created: true, 기존 저장 시 created: false)',
      type: SaveRouteResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'routeId가 비어 있으면 400 응답을 반환합니다.',
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 루트 ID인 경우 404 응답을 반환합니다.',
    }),
  );

export const ApiDeleteSavedRouteDocs = () =>
  applyDecorators(
    applySavedRouteAuthDocs(),
    ApiOperation({
      summary: '저장된 루트 삭제(찜 해제) API',
      description: '유저 보관함에 저장된 루트를 삭제(Hard Delete)합니다.',
    }),
    ApiParam({
      name: 'routeId',
      description: '보관함에서 삭제할 루트 ID',
      example: 'route_001',
    }),
    ApiOkResponse({
      description: '성공적으로 삭제 처리되었습니다.',
    }),
    ApiNotFoundResponse({
      description:
        '보관함에 저장되어 있지 않은 루트 ID인 경우 404 응답을 반환합니다.',
    }),
  );

export const ApiToggleSavedRouteCompletionDocs = () =>
  applyDecorators(
    applySavedRouteAuthDocs(),
    ApiOperation({
      summary: '여행 완료/미완료 토글 스위치 API',
      description:
        '선택한 루트에 대해 여행 완료 상태(isCompleted: true/false) 및 실제 지출 금액을 토글 처리합니다.',
    }),
    ApiParam({
      name: 'routeId',
      description: '여행 완료 상태를 변경할 루트 ID',
      example: 'route_001',
    }),
    ApiBody({ type: ToggleSavedRouteCompletionDto }),
    ApiOkResponse({
      description: '성공적으로 여행 완료 상태가 토글되었습니다.',
      type: SavedRouteCompletionResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'isCompleted가 boolean이 아닌 경우 400 응답을 반환합니다.',
    }),
    ApiNotFoundResponse({
      description: '존재하지 않는 루트 ID인 경우 404 응답을 반환합니다.',
    }),
  );
