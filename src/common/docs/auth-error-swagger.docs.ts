import {
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

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

const jwtAccessSecretMissingExample = {
  jwtAccessSecretMissing: {
    summary: 'JWT 액세스 시크릿 설정 누락',
    value: {
      message: 'JWT_ACCESS_SECRET is not configured.',
      error: 'Internal Server Error',
      statusCode: 500,
    },
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
