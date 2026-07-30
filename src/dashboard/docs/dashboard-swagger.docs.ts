import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import {
  ApiAccessTokenUnauthorizedResponseDocs,
  ApiJwtAccessTokenInternalServerErrorResponseDocs,
} from '@/common/docs/auth-error-swagger.docs';
import { SavingsDashboardResponseDto } from '@/dashboard/dto/savings-dashboard-response.dto';

export const ApiDashboardControllerDocs = () => ApiTags('Dashboard');

export const ApiGetSavingsDashboardDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
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
        '2. Bearer 토큰이 없으면 액세스 토큰 쿠키를 사용합니다.',
        '3. 인증에 성공한 사용자의 user.id 기준으로 대시보드를 조회합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description:
        '총 절약 금액, 카테고리별 절약 금액, 지역 기여 정보, 최근 여행 절약 내역을 반환합니다.',
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
