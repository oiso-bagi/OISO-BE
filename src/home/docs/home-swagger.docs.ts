import { applyDecorators } from '@nestjs/common';
import {
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
import { HomeSummaryResponseDto } from '@/home/dto/home-summary-response.dto';

export const ApiHomeControllerDocs = () => ApiTags('Home');

export const ApiGetHomeSummaryDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiOperation({
      summary: '홈 요약 조회',
      description: [
        '현재 로그인한 사용자의 홈 화면 요약 정보를 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 우선 사용합니다.',
        '2. Bearer 토큰이 없으면 액세스 토큰 쿠키를 사용합니다.',
        '3. 인증에 성공한 사용자의 user.id 기준으로 저장 루트 요약을 조회합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description:
        '총 예상 절약 금액, 저장 루트 개수, 최근 저장 루트 목록을 반환합니다.',
      type: HomeSummaryResponseDto,
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 홈 요약 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    ),
  );
