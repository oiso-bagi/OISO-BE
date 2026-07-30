import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import { SavingsDashboardResponseDto } from '@/dashboard/dto/savings-dashboard-response.dto';

const dashboardUnauthorizedExamples = {
  missingAccessToken: {
    summary: '액세스 토큰 없음',
    value: {
      message: 'Access token is required.',
      error: 'Unauthorized',
      statusCode: 401,
    },
  },
  expiredToken: {
    summary: '만료된 토큰',
    value: {
      message: 'Expired token.',
      error: 'Unauthorized',
      statusCode: 401,
    },
  },
  invalidAccessToken: {
    summary: '유효하지 않은 액세스 토큰',
    value: {
      message: 'Invalid access token.',
      error: 'Unauthorized',
      statusCode: 401,
    },
  },
  userNotFound: {
    summary: '토큰의 사용자를 찾을 수 없음',
    value: {
      message: 'Authenticated user was not found.',
      error: 'Unauthorized',
      statusCode: 401,
    },
  },
};

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
    ApiUnauthorizedResponse({
      description: [
        '액세스 토큰 인증에 실패하면 401 응답을 반환합니다.',
        '',
        '발생 가능한 메시지:',
        '- Access token is required.',
        '- Expired token.',
        '- Invalid token.',
        '- Invalid access token.',
        '- Authenticated user was not found.',
      ].join('\n'),
      content: {
        'application/json': {
          examples: dashboardUnauthorizedExamples,
        },
      },
    }),
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
    ApiInternalServerErrorResponse({
      description:
        'JWT 액세스 토큰 설정이 누락되었거나 DB 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
      content: {
        'application/json': {
          examples: {
            jwtAccessSecretMissing: {
              summary: 'JWT 액세스 시크릿 설정 누락',
              value: {
                message: 'JWT_ACCESS_SECRET is not configured.',
                error: 'Internal Server Error',
                statusCode: 500,
              },
            },
          },
        },
      },
    }),
  );
