import type { OpenAPIObject } from '@nestjs/swagger';
import { applyCommonErrorResponsesToDocument } from '@/common/docs/common-error-swagger.docs';

describe('applyCommonErrorResponsesToDocument', () => {
  it('adds the common error schema to documented error responses', () => {
    const document = createDocument({
      '/api/v1/example': {
        get: {
          responses: {
            '200': {
              description: 'OK',
            },
            '400': {
              description: 'Bad Request',
            },
          },
        },
      },
    });

    const result = applyCommonErrorResponsesToDocument(document);

    expect(result.components?.schemas?.CommonErrorResponse).toBeDefined();
    expect(result.paths['/api/v1/example'].get?.responses['400']).toMatchObject(
      {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CommonErrorResponse',
            },
          },
        },
      },
    );
  });

  it('adds a common 500 response when an operation does not define one', () => {
    const document = createDocument({
      '/api/v1/example': {
        post: {
          responses: {
            '201': {
              description: 'Created',
            },
          },
        },
      },
    });

    const result = applyCommonErrorResponsesToDocument(document);

    expect(
      result.paths['/api/v1/example'].post?.responses['500'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CommonErrorResponse',
          },
          example: {
            statusCode: 500,
            path: '/api/v1/example',
            method: 'POST',
            message: '서버 내부 오류가 발생했습니다.',
            error: 'Internal Server Error',
          },
        },
      },
    });
  });

  it('adds a status-matched example to documented error responses', () => {
    const document = createDocument({
      '/api/v1/auth/google/login': {
        get: {
          responses: {
            '302': {
              description: 'Found',
            },
            '500': {
              description: 'Internal Server Error',
            },
          },
        },
      },
    });

    const result = applyCommonErrorResponsesToDocument(document);

    expect(
      result.paths['/api/v1/auth/google/login'].get?.responses['500'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CommonErrorResponse',
          },
          example: {
            statusCode: 500,
            path: '/api/v1/auth/google/login',
            method: 'GET',
            message: '서버 내부 오류가 발생했습니다.',
            error: 'Internal Server Error',
          },
        },
      },
    });
  });
});

const createDocument = (paths: OpenAPIObject['paths']): OpenAPIObject => ({
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths,
});
