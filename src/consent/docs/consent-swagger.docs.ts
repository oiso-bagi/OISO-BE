import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import {
  ApiAccessTokenUnauthorizedResponseDocs,
  ApiJwtAccessTokenInternalServerErrorResponseDocs,
  createCommonErrorExample,
} from '@/common/docs/auth-error-swagger.docs';
import { ConsentStatusResponseDto } from '@/consent/dto/consent-status-response.dto';
import { SubmitConsentRequestDto } from '@/consent/dto/submit-consent-request.dto';

const consentBadRequestExamples = {
  missingVersion: {
    summary: '약관 버전 누락',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/consents',
      method: 'POST',
      message: '약관 버전(version) 값은 비어 있을 수 없습니다.',
      error: 'Bad Request',
    }),
  },
  invalidBoolean: {
    summary: '동의 값 형식 오류',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/consents',
      method: 'POST',
      message: '마케팅 정보 수신 동의(marketing) 값은 boolean이어야 합니다.',
      error: 'Bad Request',
    }),
  },
  requiredConsentRejected: {
    summary: '필수 약관 미동의',
    value: createCommonErrorExample({
      statusCode: 400,
      path: '/api/v1/consents',
      method: 'POST',
      message:
        '이용약관, 개인정보 수집·이용, 만 14세 이상 확인은 모두 동의해야 가입할 수 있습니다.',
      error: 'Bad Request',
    }),
  },
};

export const ApiConsentControllerDocs = () => ApiTags('Consent');

export const ApiGetConsentStatusDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiOperation({
      summary: '약관 동의 현황 조회',
      description: [
        '현재 로그인한 사용자의 약관 동의 현황을 조회합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 없음',
        '',
        '인증 방식:',
        '1. Authorization: Bearer <accessToken> 헤더를 우선 사용합니다.',
        '2. Bearer 토큰이 없으면 액세스 토큰 쿠키를 사용합니다.',
        '3. 인증에 성공한 사용자의 user.id 기준으로 약관 동의 이력을 조회합니다.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description:
        '필수 약관 동의 완료 여부와 약관별 동의 이력 목록을 반환합니다.',
      type: ConsentStatusResponseDto,
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 약관 동의 현황 조회 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    ),
  );

export const ApiSubmitConsentDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth(ACCESS_TOKEN_COOKIE),
    ApiOperation({
      summary: '약관 동의 제출',
      description: [
        '현재 로그인한 사용자의 약관 동의 값을 제출합니다.',
        '',
        '요청 파라미터: 없음',
        '요청 바디: 필요',
        '- version: string 필수, 동의 대상 약관 문서 버전',
        '- terms: boolean 필수, 이용약관 동의 여부',
        '- privacy: boolean 필수, 개인정보 수집·이용 동의 여부',
        '- age: boolean 필수, 만 14세 이상 확인 동의 여부',
        '- marketing: boolean 필수, 마케팅 정보 수신 동의 여부',
        '- location: boolean 필수, 위치기반 서비스 이용약관 동의 여부',
        '',
        '필수 약관인 terms, privacy, age는 모두 true여야 합니다.',
      ].join('\n'),
    }),
    ApiBody({
      type: SubmitConsentRequestDto,
      examples: {
        default: {
          summary: '약관 동의 제출 예시',
          value: {
            version: 'v1.0.0',
            terms: true,
            privacy: true,
            age: true,
            marketing: false,
            location: false,
          },
        },
      },
    }),
    ApiOkResponse({
      description: '약관 동의 값을 저장한 뒤 최신 약관 동의 현황을 반환합니다.',
      type: ConsentStatusResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        '요청 바디 값이 누락되었거나 필수 약관에 동의하지 않으면 400 응답을 반환합니다.',
      content: {
        'application/json': {
          examples: consentBadRequestExamples,
        },
      },
    }),
    ApiAccessTokenUnauthorizedResponseDocs(),
    ApiJwtAccessTokenInternalServerErrorResponseDocs(
      'JWT 액세스 토큰 설정이 누락되었거나 약관 동의 저장 중 예상하지 못한 오류가 발생하면 500 응답을 반환할 수 있습니다.',
    ),
  );
