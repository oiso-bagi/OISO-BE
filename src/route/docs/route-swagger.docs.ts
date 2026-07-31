import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { createCommonErrorExample } from '@/common/docs/auth-error-swagger.docs';
import { BudgetRecommendRouteRequestDto } from '@/route/dto/budget-recommend-route-request.dto';
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

const budgetRecommendBadRequestExamples = {
  invalidBody: {
    summary: '요청 바디 형식 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/recommended-routes/budget-recommend',
      method: 'POST',
      message: '요청 바디는 객체여야 합니다.',
      error: 'Bad Request',
    }),
  },
  invalidBudget: {
    summary: '예산 범위 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/recommended-routes/budget-recommend',
      method: 'POST',
      message: 'budget은 10,000 이상 500,000 이하의 안전한 정수여야 합니다.',
      error: 'Bad Request',
    }),
  },
  invalidRatioSum: {
    summary: '비율 합계 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/recommended-routes/budget-recommend',
      method: 'POST',
      message: '비용 비율의 합은 1이어야 합니다.',
      error: 'Bad Request',
    }),
  },
  invalidThemeSlugs: {
    summary: '테마 slug 형식 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/recommended-routes/budget-recommend',
      method: 'POST',
      message: 'themeSlugs는 비어 있지 않은 문자열 배열이어야 합니다.',
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

export const ApiGetBudgetRecommendedRoutesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '예산/비율 기반 추천 루트 조회',
      description: [
        '총 예산과 비용 분배 비율, 선택 테마를 기준으로 추천 루트 Top 3를 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 필요',
        '- budget: number 필수, 10,000 이상 500,000 이하의 총 예산',
        '- ratios: object 선택, foodRatio/experienceRatio/transportRatio의 합은 1',
        '- themeSlugs: string[] 선택, 선호 테마 slug 목록',
        '',
        '사용자가 입력한 총 예산 안에서 음식, 체험, 교통 비용 선호 비율을 반영해 적합한 추천 루트를 찾습니다.',
        '테마 slug를 함께 전달하면 선택한 테마와 예산 조건을 모두 고려해 후보 루트를 선별합니다.',
      ].join('\n'),
    }),
    ApiBody({
      type: BudgetRecommendRouteRequestDto,
      examples: {
        default: {
          summary: '예산 기반 추천 요청 예시',
          value: {
            budget: 100000,
            ratios: {
              foodRatio: 0.4,
              experienceRatio: 0.4,
              transportRatio: 0.2,
            },
            themeSlugs: ['local-food', 'photo-spot'],
          },
        },
      },
    }),
    ApiOkResponse({
      description:
        '예산과 선호 비율에 맞는 추천 루트 Top 3를 반환합니다. 조건에 맞는 루트가 없으면 빈 배열을 반환합니다.',
      type: [RecommendedRouteListResponseDto],
    }),
    ApiBadRequestResponse({
      description:
        '예산, 비율, 테마 slug 형식이 올바르지 않으면 400 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: budgetRecommendBadRequestExamples,
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description:
        '예산 기반 추천 루트 조회 중 예상하지 못한 서버 오류가 발생하면 500 응답을 반환할 수 있습니다.',
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
