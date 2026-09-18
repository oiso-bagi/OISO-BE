import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAccessTokenUnauthorizedResponseDocs,
  ApiJwtAccessTokenInternalServerErrorResponseDocs,
} from '@/common/docs/auth-error-swagger.docs';
import {
  SavingsDashboardResponseDto,
  SavingsHistoriesPageResponseDto,
} from '@/dashboard/dto/savings-dashboard-response.dto';

export const ApiDashboardControllerDocs = () => ApiTags('Dashboard');

export const ApiGetSavingsDashboardDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '예산 대비 예상 절약 효과 대시보드 조회',
      description: [
        '현재 로그인한 사용자의 완료 여행 기준 예산 대비 예상 절약 효과 대시보드 데이터를 조회합니다.',
        '절약 효과는 실제 지출이 아니라 기본 예산과 추천 코스 예상 비용을 비교해 계산합니다.',
        '',
        '계산 기준:',
        '- 기본 예산: 1일 60,000원',
        '- 식비 예산 비율: 35%',
        '- 교통비 예산 비율: 40%',
        '- 체험비 예산 비율: 25%',
        '- 항목별 예상 절약 효과 = max(0, 항목별 기준 예산 - 항목별 추천 코스 예상 비용)',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 우선 사용합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description:
        '총 예상 절약 효과 금액, 카테고리별 예상 절약 효과 금액, 지역 기여 정보, 최근 완료 여행 예상 절약 효과 내역을 반환합니다.',
      type: SavingsDashboardResponseDto,
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiBadRequestResponse({
      description:
        '인증된 사용자 ID가 비어 있는 경우 400 응답을 반환할 수 있습니다.',
      content: {
        'application/json': {
          examples: {
            invalidUserId: {
              summary: '사용자 ID 없음',
              value: {
                message: '사용자 ID는 비어 있을 수 없습니다.',
                error: 'Bad Request',
                statusCode: 400,
              },
            },
          },
        },
      },
    }),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 DB 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    ),
  );

export const ApiGetSavingsHistoriesDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '예상 절약 효과 히스토리 페이지 조회',
      description: [
        '현재 로그인한 사용자의 완료 여행 예상 절약 효과 히스토리를 페이지 단위로 조회합니다.',
        'savedAmountWon은 실제 지출 기반 절약액이 아니라 기본 예산 대비 추천 코스 예상 절약 효과입니다.',
        '',
        '계산 기준:',
        '- 기본 예산: 1일 60,000원',
        '- 여행별 예상 절약 효과 = max(0, 기본 예산 × 여행 일수 - 추천 코스 예상 비용)',
        '',
        'Query parameters:',
        '- page: 1부터 시작하는 페이지 번호. 기본값 1',
        '- size: 페이지당 항목 수. 기본값 10, 최대 100',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 전송합니다.',
      ].join('\n'),
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number. Starts from 1.',
      example: 1,
    }),
    ApiQuery({
      name: 'size',
      required: false,
      description: 'Number of items per page. Max 100.',
      example: 10,
    }),
    ApiOkResponse({
      description:
        '완료 여행의 기준 예산 대비 예상 절약 효과 히스토리 페이지를 반환합니다.',
      type: SavingsHistoriesPageResponseDto,
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiBadRequestResponse({
      description:
        '사용자 ID가 비어 있거나 page/size query 값이 유효하지 않으면 400 응답을 반환합니다.',
    }),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT access token 설정이 누락되었거나 DB 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환합니다.',
    ),
  );
