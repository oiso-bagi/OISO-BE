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
      summary: '절약 대시보드 조회',
      description: [
        '현재 로그인한 사용자의 절약 대시보드 데이터를 조회합니다.',
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
        '총 절약 금액, 카테고리별 절약률(%), 지역 기여 정보, 최근 여행 절약 내역을 반환합니다.',
      type: SavingsDashboardResponseDto,
      schema: {
        example: {
          totalSavingsWon: 48000,
          tripCount: 3,
          averageSavingsWon: 16000,
          savingsByCategory: [
            { label: '식비', savingRatePercent: 35 },
            { label: '교통비', savingRatePercent: 45 },
            { label: '체험비', savingRatePercent: 30 },
          ],
          localContribution: {
            scorePercent: 72,
            label: '외곽·원도심 상권 방문',
            message: '관광 수요 분산에 기여하고 있어요',
          },
          histories: [
            {
              routeId: 'route_001',
              routeName: '부산 영도 흰여울 & 깡깡이 예술마을 코스',
              trippedAt: '2026-07-31T03:00:00.000Z',
              savedAmountWon: 15000,
            },
          ],
        },
      },
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
      summary: 'Savings history page lookup',
      description: [
        'Returns completed savings histories for the current user in page units.',
        '',
        'Query parameters:',
        '- page: page number starting from 1. default 1',
        '- size: item count per page. default 10, max 100',
        '',
        'Auth:',
        '1. Send Authorization: Bearer <accessToken> header.',
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
      description: 'Returns paginated completed savings history items.',
      type: SavingsHistoriesPageResponseDto,
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiBadRequestResponse({
      description:
        'Returns 400 when user id is empty or page/size query values are invalid.',
    }),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'Returns 500 when JWT access token configuration is missing or an unexpected database lookup error occurs.',
    ),
  );
