import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiFoundResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import { AuthSessionResponseDto } from '@/auth/dto/auth-session-response.dto';
import { AuthTokenResponseDto } from '@/auth/dto/auth-token-response.dto';
import { CurrentUserResponseDto } from '@/auth/dto/current-user-response.dto';
import {
  ApiAccessTokenUnauthorizedResponseDocs,
  ApiJwtAccessTokenInternalServerErrorResponseDocs,
  createCommonErrorExample,
} from '@/common/docs/auth-error-swagger.docs';

const socialCallbackFailureDescription = [
  '콜백 처리 중 오류가 발생해도 이 API는 일반적인 4xx/5xx JSON 응답을 반환하지 않습니다.',
  '서버는 인증 관련 쿠키를 정리한 뒤 실패 화면으로 302 리다이렉트합니다.',
  '',
  '실패 리다이렉트 reason 값:',
  '- kakao_canceled: 사용자가 카카오 로그인을 취소한 경우',
  '- google_canceled: 사용자가 구글 로그인을 취소한 경우',
  '- oauth_canceled: 제공자를 특정할 수 없는 OAuth 취소',
  '- missing_code: 인증 코드가 전달되지 않은 경우',
  '- invalid_state: state 값이 없거나 쿠키의 state와 일치하지 않는 경우',
  '- token_exchange_failed: 소셜 인증 코드를 토큰으로 교환하지 못한 경우',
  '- profile_fetch_failed: 소셜 사용자 프로필 조회에 실패한 경우',
  '- email_required: 소셜 계정에서 이메일을 받을 수 없는 경우',
  '- nickname_required: 소셜 계정에서 닉네임을 받을 수 없는 경우',
  '- email_conflict: 같은 이메일이 다른 계정에 이미 연결된 경우',
  '- server_error: 그 외 서버 오류, 외부 API 타임아웃, 설정 누락 등',
].join('\n');

const refreshTokenUnauthorizedDescription = [
  '리프레시 토큰 인증에 실패하면 401 응답을 반환합니다.',
  '',
  '요청 파라미터: 없음',
  '요청 바디: 없음',
  '필수 인증 값: 리프레시 토큰 쿠키',
  '',
  '발생 가능한 메시지:',
  '- 리프레시 토큰이 필요합니다.',
  '- 토큰이 만료되었습니다.',
  '- 유효하지 않은 토큰입니다.',
  '- 유효하지 않은 리프레시 토큰입니다.',
  '- 인증된 사용자를 찾을 수 없습니다.',
].join('\n');

const refreshTokenUnauthorizedExamples = {
  missingRefreshToken: {
    summary: '리프레시 토큰 없음',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: '리프레시 토큰이 필요합니다.',
      error: 'Unauthorized',
    }),
  },
  expiredToken: {
    summary: '만료된 토큰',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: '토큰이 만료되었습니다.',
      error: 'Unauthorized',
    }),
  },
  invalidRefreshToken: {
    summary: '유효하지 않은 리프레시 토큰',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: '유효하지 않은 리프레시 토큰입니다.',
      error: 'Unauthorized',
    }),
  },
  userNotFound: {
    summary: '토큰의 사용자를 찾을 수 없음',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: '인증된 사용자를 찾을 수 없습니다.',
      error: 'Unauthorized',
    }),
  },
};

const internalServerErrorExamples = {
  jwtRefreshSecretMissing: {
    summary: 'JWT 리프레시 시크릿 설정 누락',
    value: createCommonErrorExample({
      statusCode: 500,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: 'JWT_REFRESH_SECRET 설정이 누락되었습니다.',
      error: 'Internal Server Error',
    }),
  },
  jwtSecretMissing: {
    summary: 'JWT 액세스 시크릿 설정 누락',
    value: createCommonErrorExample({
      statusCode: 500,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: 'JWT_ACCESS_SECRET 설정이 누락되었습니다.',
      error: 'Internal Server Error',
    }),
  },
  invalidJwtExpiration: {
    summary: 'JWT 만료 시간 설정 오류',
    value: createCommonErrorExample({
      statusCode: 500,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      message: 'JWT 만료 시간 설정 형식이 올바르지 않습니다.',
      error: 'Internal Server Error',
    }),
  },
};

export const ApiAuthControllerDocs = () => ApiTags('Auth');

export const ApiRedirectToKakaoDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '카카오 로그인 페이지로 이동',
      description: [
        '카카오 소셜 로그인을 시작하는 API입니다.',
        '',
        '1. 카카오 로그인 버튼 클릭 시 브라우저를 GET /api/v1/auth/kakao/login 경로로 이동시킵니다.',
        '2. 서버는 OAuth state 쿠키를 저장한 뒤 카카오 인증 페이지로 리다이렉트합니다.',
        '3. 인증 완료 후 카카오가 GET /api/v1/auth/kakao/callback 경로를 호출합니다.',
        '4. 서버는 인증 코드와 state를 검증하고 리프레시 토큰 쿠키를 설정합니다.',
        '5. 처리 결과에 따라 프론트엔드 성공, 약관 동의, 또는 실패 화면으로 리다이렉트합니다.',
        '6. 프론트엔드는 성공 화면 진입 후 POST /api/v1/auth/refresh를 호출해 액세스 토큰을 발급받을 수 있습니다.',
      ].join('\n'),
    }),
    ApiFoundResponse({
      description:
        '카카오 OAuth 인증 URL로 리다이렉트합니다. AJAX보다 브라우저 이동 방식으로 연결하는 것을 권장합니다.',
    }),
    ApiInternalServerErrorResponse({
      description:
        '카카오 OAuth 설정값이 누락되었거나 잘못된 경우 500 응답을 반환할 수 있습니다. 관련 설정: KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI',
    }),
  );

export const ApiHandleKakaoCallbackDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '카카오 OAuth 콜백 처리',
      description: [
        '카카오 인증 서버가 호출하는 서버 콜백 API입니다.',
        '',
        '연결 시 주의사항:',
        '1. 프론트엔드가 직접 호출하는 API가 아닙니다.',
        '2. 카카오 개발자 콘솔의 Redirect URI가 이 경로를 바라보도록 설정해야 합니다.',
        '3. 사용자는 먼저 GET /api/v1/auth/kakao/login 경로로 진입해야 합니다.',
        '4. 인증 완료 후 카카오가 이 콜백으로 code와 state를 전달합니다.',
        '5. 서버는 state를 쿠키와 비교해 검증하고 카카오 프로필 조회와 로그인을 처리합니다.',
        '6. 서버는 리프레시 토큰 쿠키를 설정하고 기존 액세스 토큰 쿠키를 정리한 뒤 프론트엔드 화면으로 리다이렉트합니다.',
        '7. 프론트엔드는 성공 화면 진입 후 POST /api/v1/auth/refresh를 호출해 액세스 토큰을 발급받을 수 있습니다.',
      ].join('\n'),
    }),
    ApiFoundResponse({
      description: [
        '로그인 결과에 따라 프론트엔드 성공, 약관 동의, 또는 실패 URL로 리다이렉트합니다.',
        '',
        socialCallbackFailureDescription,
      ].join('\n'),
    }),
  );

export const ApiRedirectToGoogleDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '구글 로그인 페이지로 이동',
      description: [
        '구글 소셜 로그인을 시작하는 API입니다.',
        '',
        '1. 구글 로그인 버튼 클릭 시 브라우저를 GET /api/v1/auth/google/login 경로로 이동시킵니다.',
        '2. 서버는 OAuth state 쿠키를 저장한 뒤 구글 인증 페이지로 리다이렉트합니다.',
        '3. 인증 완료 후 구글이 GET /api/v1/auth/google/callback 경로를 호출합니다.',
        '4. 서버는 인증 코드와 state를 검증하고 리프레시 토큰 쿠키를 설정합니다.',
        '5. 처리 결과에 따라 프론트엔드 성공, 약관 동의, 또는 실패 화면으로 리다이렉트합니다.',
        '6. 프론트엔드는 성공 화면 진입 후 POST /api/v1/auth/refresh를 호출해 액세스 토큰을 발급받을 수 있습니다.',
      ].join('\n'),
    }),
    ApiFoundResponse({
      description:
        '구글 OAuth 인증 URL로 리다이렉트합니다. AJAX보다 브라우저 이동 방식으로 연결하는 것을 권장합니다.',
    }),
    ApiInternalServerErrorResponse({
      description:
        '구글 OAuth 설정값이 누락되었거나 잘못된 경우 500 응답을 반환할 수 있습니다. 관련 설정: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI',
    }),
  );

export const ApiHandleGoogleCallbackDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '구글 OAuth 콜백 처리',
      description: [
        '구글 인증 서버가 호출하는 서버 콜백 API입니다.',
        '',
        '연결 시 주의사항:',
        '1. 프론트엔드가 직접 호출하는 API가 아닙니다.',
        '2. Google Cloud Console의 Authorized redirect URI가 이 경로를 바라보도록 설정해야 합니다.',
        '3. 사용자는 먼저 GET /api/v1/auth/google/login 경로로 진입해야 합니다.',
        '4. 인증 완료 후 구글이 이 콜백으로 code와 state를 전달합니다.',
        '5. 서버는 state를 쿠키와 비교해 검증하고 구글 프로필 조회와 로그인을 처리합니다.',
        '6. 서버는 리프레시 토큰 쿠키를 설정하고 기존 액세스 토큰 쿠키를 정리한 뒤 프론트엔드 화면으로 리다이렉트합니다.',
        '7. 프론트엔드는 성공 화면 진입 후 POST /api/v1/auth/refresh를 호출해 액세스 토큰을 발급받을 수 있습니다.',
      ].join('\n'),
    }),
    ApiFoundResponse({
      description: [
        '로그인 결과에 따라 프론트엔드 성공, 약관 동의, 또는 실패 URL로 리다이렉트합니다.',
        '',
        socialCallbackFailureDescription,
      ].join('\n'),
    }),
  );

export const ApiGetCurrentUserDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiOperation({
      summary: '현재 로그인한 사용자 조회',
      description: [
        '현재 로그인한 사용자 정보를 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 우선 사용합니다.',
        '2. Bearer 토큰이 없으면 액세스 토큰 쿠키를 사용합니다.',
        '3. 액세스 토큰이 없거나 유효하지 않으면 401 응답을 반환합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description: '현재 인증된 사용자 정보를 반환합니다.',
      type: CurrentUserResponseDto,
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 잘못된 경우 500 응답을 반환할 수 있습니다. 관련 설정: JWT_ACCESS_SECRET',
    ),
  );

export const ApiRefreshAccessTokenDocs = () =>
  applyDecorators(
    ApiCookieAuth(REFRESH_TOKEN_COOKIE),
    ApiOperation({
      summary: '액세스 토큰 재발급',
      description: [
        '리프레시 토큰 쿠키를 사용해 새 액세스 토큰을 발급합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '필수 인증 값: 리프레시 토큰 쿠키',
        '',
        '1. 소셜 로그인 성공 후 프론트엔드 화면으로 돌아오면 이 API를 호출합니다.',
        '2. 서버는 리프레시 토큰 쿠키를 검증합니다.',
        '3. 검증에 성공하면 응답 본문으로 accessToken과 tokenType을 반환합니다.',
        '4. 리프레시 토큰이 없거나 유효하지 않으면 401 응답을 반환합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description: '리프레시 토큰 쿠키를 검증하고 새 액세스 토큰을 반환합니다.',
      type: AuthTokenResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: refreshTokenUnauthorizedDescription,
      content: {
        'application/json': {
          examples: refreshTokenUnauthorizedExamples,
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description:
        'JWT 설정이 누락되었거나 만료 시간 형식이 잘못된 경우 500 응답을 반환할 수 있습니다. 관련 설정: JWT_REFRESH_SECRET, JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN',
      content: {
        'application/json': {
          examples: internalServerErrorExamples,
        },
      },
    }),
  );

export const ApiGetSessionDocs = () =>
  applyDecorators(
    ApiCookieAuth(REFRESH_TOKEN_COOKIE),
    ApiOperation({
      summary: '인증 세션 상태 조회',
      description: [
        '리프레시 토큰 쿠키 기준으로 현재 브라우저에 유효한 인증 세션이 있는지 확인합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '선택 인증 값: 리프레시 토큰 쿠키',
        '',
        '에러 처리:',
        '1. 리프레시 토큰이 없으면 authenticated: false를 반환합니다.',
        '2. 리프레시 토큰이 만료되었거나 유효하지 않아도 authenticated: false를 반환합니다.',
        '3. 토큰의 사용자를 DB에서 찾을 수 없어도 authenticated: false를 반환합니다.',
        '4. JWT 설정 누락 등 서버 설정 문제는 500 응답을 반환할 수 있습니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description: [
        '현재 요청의 인증 세션 보유 여부를 반환합니다.',
        '',
        '리프레시 토큰이 없거나, 만료되었거나, 유효하지 않거나, 토큰의 사용자를 찾을 수 없는 경우에도 에러를 던지지 않고 authenticated: false를 반환합니다.',
      ].join('\n'),
      type: AuthSessionResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description:
        '세션 확인 중 예상하지 못한 오류가 발생하거나 JWT 설정이 누락된 경우 500 응답을 반환할 수 있습니다. 관련 설정: JWT_REFRESH_SECRET',
      content: {
        'application/json': {
          examples: {
            jwtRefreshSecretMissing: {
              summary: 'JWT 리프레시 시크릿 설정 누락',
              value: createCommonErrorExample({
                statusCode: 500,
                path: '/api/v1/auth/session',
                method: 'GET',
                message: 'JWT_REFRESH_SECRET 설정이 누락되었습니다.',
                error: 'Internal Server Error',
              }),
            },
          },
        },
      },
    }),
  );

export const ApiLogoutDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '로그아웃',
      description: [
        '별도 인증 검증 없이 액세스 토큰 쿠키와 리프레시 토큰 쿠키를 삭제합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '',
        '에러 처리:',
        '1. 쿠키가 이미 없어도 성공 응답은 동일하게 204입니다.',
        '2. 현재 구현상 인증 실패로 인한 4xx 에러 응답은 없습니다.',
      ].join('\n'),
    }),
    ApiNoContentResponse({
      description: '인증 쿠키를 삭제하고 본문 없이 응답합니다.',
    }),
  );
