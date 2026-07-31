import type { OpenAPIObject } from '@nestjs/swagger';

type OpenApiMediaTypeObject = {
  schema?: Record<string, unknown>;
  examples?: Record<string, unknown>;
};

type OpenApiResponseObject = {
  description?: string;
  content?: Record<string, OpenApiMediaTypeObject>;
};

type OpenApiReferenceObject = {
  $ref: string;
};

type OpenApiOperationObject = {
  responses?: Record<
    string,
    OpenApiReferenceObject | OpenApiResponseObject | undefined
  >;
};

const ERROR_RESPONSE_SCHEMA_NAME = 'CommonErrorResponse';
const ERROR_RESPONSE_SCHEMA_REF = `#/components/schemas/${ERROR_RESPONSE_SCHEMA_NAME}`;

const commonErrorResponseSchema = {
  type: 'object',
  required: ['statusCode', 'timestamp', 'path', 'method', 'message', 'error'],
  properties: {
    statusCode: {
      type: 'number',
      example: 400,
      description: 'HTTP status code',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      example: '2026-08-01T00:00:00.000Z',
      description: 'Error response timestamp',
    },
    path: {
      type: 'string',
      example: '/api/v1/recommended-routes/%20',
      description: 'Request path',
    },
    method: {
      type: 'string',
      example: 'GET',
      description: 'HTTP method',
    },
    message: {
      oneOf: [
        {
          type: 'string',
          example: 'Recommended route ID must not be empty.',
        },
        {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['dailyBudgetWon must be a safe positive integer.'],
        },
      ],
      description: 'Error message',
    },
    error: {
      type: 'string',
      example: 'Bad Request',
      description: 'HTTP error name',
    },
  },
};

const commonInternalServerErrorResponse: OpenApiResponseObject = {
  description:
    'Unexpected server error. Internal details are not exposed in API responses.',
  content: {
    'application/json': {
      schema: {
        $ref: ERROR_RESPONSE_SCHEMA_REF,
      },
      examples: {
        internalServerError: {
          summary: 'Internal server error',
          value: {
            statusCode: 500,
            timestamp: '2026-08-01T00:00:00.000Z',
            path: '/api/v1/example',
            method: 'GET',
            message: 'Internal server error',
            error: 'Internal Server Error',
          },
        },
      },
    },
  },
};

export const applyCommonErrorResponsesToDocument = (
  document: OpenAPIObject,
): OpenAPIObject => {
  document.components = document.components ?? {};
  document.components.schemas = {
    ...document.components.schemas,
    [ERROR_RESPONSE_SCHEMA_NAME]: commonErrorResponseSchema,
  };

  for (const pathItem of Object.values(document.paths)) {
    if (!pathItem) {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!isOperationObject(operation)) {
        continue;
      }

      operation.responses = operation.responses ?? {};

      for (const [statusCode, response] of Object.entries(
        operation.responses,
      )) {
        if (
          response &&
          isErrorStatusCode(statusCode) &&
          isResponseObject(response)
        ) {
          attachCommonErrorSchema(response);
        }
      }

      if (!operation.responses['500']) {
        operation.responses['500'] = commonInternalServerErrorResponse;
      }
    }
  }

  return document;
};

const isErrorStatusCode = (statusCode: string): boolean => {
  const numericStatusCode = Number(statusCode);

  return (
    Number.isInteger(numericStatusCode) &&
    numericStatusCode >= 400 &&
    numericStatusCode < 600
  );
};

const isOperationObject = (value: unknown): value is OpenApiOperationObject =>
  Boolean(value && typeof value === 'object' && 'responses' in value);

const isResponseObject = (
  value: OpenApiReferenceObject | OpenApiResponseObject,
): value is OpenApiResponseObject => 'description' in value;

const attachCommonErrorSchema = (response: OpenApiResponseObject): void => {
  response.content = response.content ?? {};
  response.content['application/json'] =
    response.content['application/json'] ?? {};
  response.content['application/json'].schema = {
    $ref: ERROR_RESPONSE_SCHEMA_REF,
  };
};
