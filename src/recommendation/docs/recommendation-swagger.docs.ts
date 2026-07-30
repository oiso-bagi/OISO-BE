import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RecommendRouteRequestDto } from '@/recommendation/dto/recommend-route-request.dto';
import { RecommendationOptionsResponseDto } from '@/recommendation/dto/recommendation-options-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';

const recommendationBadRequestExamples = {
  missingTravelStyleSlugs: {
    summary: '여행 스타일 누락',
    value: {
      message: 'travelStyleSlugs must include at least one item.',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
  invalidTravelStyleSlugs: {
    summary: '여행 스타일 형식 오류',
    value: {
      message: 'travelStyleSlugs must contain only non-empty strings.',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
  unsupportedTravelStyleSlug: {
    summary: '지원하지 않는 여행 스타일',
    value: {
      message: 'travelStyleSlugs contains an unsupported item.',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
  invalidDurationDays: {
    summary: '여행 기간 범위 오류',
    value: {
      message: 'durationDays must be between 1 and 5.',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
  invalidDailyBudgetWon: {
    summary: '1일 예산 형식 오류',
    value: {
      message: 'dailyBudgetWon must be a safe positive integer.',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
  unsafeTotalBudgetWon: {
    summary: '총 예산 안전 정수 범위 초과',
    value: {
      message: 'totalBudgetWon must be a safe positive integer.',
      error: 'Bad Request',
      statusCode: 400,
    },
  },
};

export const ApiRecommendationControllerDocs = () => ApiTags('Recommendation');

export const ApiGetRecommendationOptionsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '추천 옵션 조회',
      description: [
        '추천 루트 요청 화면에서 사용할 선택 옵션을 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '인증: 필요 없음',
        '',
        '에러 처리:',
        '현재 구현상 요청값 검증으로 발생하는 4xx 에러는 없습니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description:
        '여행 스타일, 여행 기간, 예산 프리셋, 예산 배분 옵션을 반환합니다.',
      type: RecommendationOptionsResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description:
        '추천 옵션 구성 중 예상하지 못한 서버 오류가 발생하면 500 응답을 반환할 수 있습니다.',
      content: {
        'application/json': {
          examples: {
            internalServerError: {
              summary: '서버 내부 오류',
              value: {
                message: 'Internal server error',
                statusCode: 500,
              },
            },
          },
        },
      },
    }),
  );

export const ApiRecommendRoutesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '추천 루트 목록 조회',
      description: [
        '사용자가 선택한 여행 스타일, 여행 기간, 1일 예산을 기준으로 추천 루트 목록을 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 필요',
        '- travelStyleSlugs: string[] 필수, 지원하는 여행 스타일 slug 목록',
        '- durationDays: number 필수, 1~5 사이의 여행 기간',
        '- dailyBudgetWon: number 필수, 안전한 양의 정수인 1일 예산(원)',
        '',
        '인증: 필요 없음',
      ].join('\n'),
    }),
    ApiBody({
      type: RecommendRouteRequestDto,
      examples: {
        default: {
          summary: '추천 요청 예시',
          value: {
            travelStyleSlugs: ['local-food', 'cafe'],
            durationDays: 2,
            dailyBudgetWon: 60000,
          },
        },
      },
    }),
    ApiOkResponse({
      description:
        '조건에 맞는 추천 루트 목록을 반환합니다. 조건에 맞는 루트가 없으면 빈 배열을 반환합니다.',
      type: [RecommendedRouteListResponseDto],
    }),
    ApiBadRequestResponse({
      description:
        '요청 바디 값이 누락되었거나 지원 범위를 벗어나면 400 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: recommendationBadRequestExamples,
        },
      },
    }),
  );
