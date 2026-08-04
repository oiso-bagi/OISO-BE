import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { createCommonErrorExample } from '@/common/docs/auth-error-swagger.docs';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';

const routeBadRequestExamples = {
  emptyRouteId: {
    summary: '추천 루트 ID 공백',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/recommended-routes/%20',
      method: 'GET',
      message: '추천 루트 ID는 비어 있을 수 없습니다.',
      error: 'Bad Request',
    }),
  },
};

const routeNotFoundExamples = {
  routeNotFound: {
    summary: '추천 루트 없음',
    value: createCommonErrorExample({
      statusCode: 404,
      path: '/api/v1/recommended-routes/route_999',
      method: 'GET',
      message: '추천 루트를 찾을 수 없습니다.',
      error: 'Not Found',
    }),
  },
};

export const ApiRouteControllerDocs = () => ApiTags('Route');

export const ApiGetRecommendedRouteListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '추천 루트 목록 조회',
      description: [
        '저장된 추천 루트 목록을 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '인증: 필요 없음',
      ].join('\n'),
    }),
    ApiOkResponse({
      description:
        '추천 루트 목록을 반환합니다. 루트가 없으면 빈 배열을 반환합니다.',
      type: [RecommendedRouteListResponseDto],
    }),
    ApiInternalServerErrorResponse({
      description:
        '추천 루트 목록 조회 중 예상하지 못한 서버 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    }),
  );

export const ApiGetRecommendedRouteDetailDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '추천 루트 상세 조회',
      description: [
        '추천 루트 ID로 루트 상세 정보와 경유지 목록을 조회합니다.',
        '',
        '요청 파라미터:',
        '- id: 추천 루트 ID',
        '요청 바디: 없음',
        '인증: 필요 없음',
      ].join('\n'),
    }),
    ApiParam({
      name: 'id',
      description: '조회할 추천 루트 ID',
      example: 'route_001',
    }),
    ApiOkResponse({
      description: '추천 루트 상세 정보와 경유지 목록을 반환합니다.',
      type: RecommendedRouteDetailResponseDto,
    }),
    ApiBadRequestResponse({
      description: '추천 루트 ID가 비어 있으면 400 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: routeBadRequestExamples,
        },
      },
    }),
    ApiNotFoundResponse({
      description:
        '추천 루트 ID에 해당하는 루트가 없으면 404 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: routeNotFoundExamples,
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description:
        '추천 루트 상세 조회 중 예상하지 못한 서버 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    }),
  );
