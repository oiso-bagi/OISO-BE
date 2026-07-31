import {
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type CommonErrorExampleParams = {
  statusCode: number;
  path: string;
  method: string;
  message: string;
  error: string;
};

export const createCommonErrorExample = ({
  statusCode,
  path,
  method,
  message,
  error,
}: CommonErrorExampleParams) => ({
  statusCode,
  timestamp: '2026-08-01T00:00:00.000Z',
  path,
  method,
  message,
  error,
});

const accessTokenUnauthorizedDescription = [
  '액세스 토큰 인증에 실패하면 401 응답을 반환합니다.',
  '',
  '요청 파라미터: 없음',
  '요청 바디: 없음',
  '',
  '발생 가능한 메시지:',
  '- Access token is required.',
  '- Expired token.',
  '- Invalid token.',
  '- Invalid access token.',
  '- Authenticated user was not found.',
].join('\n');

const accessTokenUnauthorizedExamples = {
  missingAccessToken: {
    summary: '액세스 토큰 없음',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/me',
      method: 'GET',
      message: 'Access token is required.',
      error: 'Unauthorized',
    }),
  },
  expiredToken: {
    summary: '만료된 토큰',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/me',
      method: 'GET',
      message: 'Expired token.',
      error: 'Unauthorized',
    }),
  },
  invalidAccessToken: {
    summary: '유효하지 않은 액세스 토큰',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/me',
      method: 'GET',
      message: 'Invalid access token.',
      error: 'Unauthorized',
    }),
  },
  userNotFound: {
    summary: '토큰의 사용자를 찾을 수 없음',
    value: createCommonErrorExample({
      statusCode: 401,
      path: '/api/v1/me',
      method: 'GET',
      message: 'Authenticated user was not found.',
      error: 'Unauthorized',
    }),
  },
};

const jwtAccessSecretMissingExample = {
  jwtAccessSecretMissing: {
    summary: 'JWT 액세스 시크릿 설정 누락',
    value: createCommonErrorExample({
      statusCode: 500,
      path: '/api/v1/me',
      method: 'GET',
      message: 'JWT_ACCESS_SECRET is not configured.',
      error: 'Internal Server Error',
    }),
  },
};

export const ApiAccessTokenUnauthorizedResponseDocs = () =>
  ApiUnauthorizedResponse({
    description: accessTokenUnauthorizedDescription,
    content: {
      'application/json': {
        examples: accessTokenUnauthorizedExamples,
      },
    },
  });

export const ApiJwtAccessTokenInternalServerErrorResponseDocs = (
  description: string,
) =>
  ApiInternalServerErrorResponse({
    description,
    content: {
      'application/json': {
        examples: jwtAccessSecretMissingExample,
      },
    },
  });
