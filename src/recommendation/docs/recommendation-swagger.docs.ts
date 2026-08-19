import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createCommonErrorExample } from '@/common/docs/auth-error-swagger.docs';
import { RecommendRouteRequestDto } from '@/recommendation/dto/recommend-route-request.dto';
import { RecommendationOptionsResponseDto } from '@/recommendation/dto/recommendation-options-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';

const RECOMMENDATION_ROUTE_PATH = '/api/v1/recommended-routes/recommend';
const RECOMMENDATION_ROUTE_METHOD = 'POST';
const RECOMMENDATION_OPTIONS_PATH =
  '/api/v1/recommended-routes/recommend/options';
const RECOMMENDATION_OPTIONS_METHOD = 'GET';

const recommendationBadRequestExamples = {
  missingTravelStyleSlugs: {
    summary: '여행 스타일 누락',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message: 'travelStyleSlugs는 최소 1개 이상 포함해야 합니다.',
      error: 'Bad Request',
    }),
  },
  invalidTravelStyleSlugs: {
    summary: '여행 스타일 형식 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message: 'travelStyleSlugs는 비어 있지 않은 문자열만 포함해야 합니다.',
      error: 'Bad Request',
    }),
  },
  unsupportedTravelStyleSlug: {
    summary: '지원하지 않는 여행 스타일',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message: '지원하지 않는 travelStyleSlugs 항목이 포함되어 있습니다.',
      error: 'Bad Request',
    }),
  },
  invalidDurationDays: {
    summary: '여행 기간 범위 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message: 'durationDays는 1부터 5 사이여야 합니다.',
      error: 'Bad Request',
    }),
  },
  invalidDailyBudgetWon: {
    summary: '1일 예산 형식 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message: 'dailyBudgetWon은 안전한 양의 정수여야 합니다.',
      error: 'Bad Request',
    }),
  },
  unsafeTotalBudgetWon: {
    summary: '총 예산 안전 정수 범위 초과',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message: 'totalBudgetWon은 안전한 양의 정수여야 합니다.',
      error: 'Bad Request',
    }),
  },
  invalidRatiosSum: {
    summary: '예산 비율 합계 오류 (1.0 불일치)',
    value: createCommonErrorExample({
      statusCode: 400,
      path: RECOMMENDATION_ROUTE_PATH,
      method: RECOMMENDATION_ROUTE_METHOD,
      message:
        'ratios의 합계(foodRatio + experienceRatio + transportRatio)는 1.0이어야 합니다.',
      error: 'Bad Request',
    }),
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
              value: createCommonErrorExample({
                statusCode: 500,
                path: RECOMMENDATION_OPTIONS_PATH,
                method: RECOMMENDATION_OPTIONS_METHOD,
                message: '서버 내부 오류가 발생했습니다.',
                error: 'Internal Server Error',
              }),
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
        '사용자가 선택한 여행 스타일, 여행 기간, 1일 예산 및 선호 비용 비율을 기준으로 추천 루트 목록을 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 필요',
        '- travelStyleSlugs: string[] 필수, 여행 스타일 slug (local-food: 부산 로컬 맛집, emotion-cafe: 감성 카페, beach-tour: 바다 관광, photo-spot: 포토 스팟, traditional-market: 전통시장, nature-walk: 자연 / 산책) 목록',
        '- durationDays: number 필수, 1~5 사이의 여행 기간',
        '- dailyBudgetWon: number 필수, 안전한 양의 정수인 1일 예산(원)',
        '- ratios: object 선택, { foodRatio, experienceRatio, transportRatio } 합계 1.0 (미입력 시 기본 0.35/0.25/0.40 적용)',
        '',
        '[다일차 패키지 코스 조합 응답 스펙 (durationDays >= 2)]',
        '- stopLocations[].sequence: 전체 일정을 통틀어 0부터 연속하여 1씩 증가하는 글로벌 방문 순서 인덱스 (0, 1, 2, 3, 4, 5...)',
        '- stopLocations[].dayNumber: 해당 경유 장소가 며칠 차 방문지인지 나타내는 일차 번호 (1, 2, 3...)',
        '- 예시 (durationDays: 3 다일차 요청 시):',
        '  - 1일차 장소들: dayNumber = 1 (sequence: 0, 1, 2)',
        '  - 2일차 장소들: dayNumber = 2 (sequence: 3, 4, 5)',
        '  - 3일차 장소들: dayNumber = 3 (sequence: 6, 7, 8)',
        '',
        '인증: 필요 없음',
      ].join('\n'),
    }),
    ApiBody({
      type: RecommendRouteRequestDto,
      examples: {
        default: {
          summary: '추천 요청 예시 (비율 지정)',
          value: {
            travelStyleSlugs: ['local-food', 'emotion-cafe'],
            durationDays: 2,
            dailyBudgetWon: 60000,
            ratios: {
              foodRatio: 0.35,
              experienceRatio: 0.25,
              transportRatio: 0.4,
            },
          },
        },
        withoutRatios: {
          summary: '추천 요청 예시 (기본 비율 적용)',
          value: {
            travelStyleSlugs: ['local-food', 'emotion-cafe'],
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
