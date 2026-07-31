import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';

type ErrorResponseBody = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
};

describe('HttpExceptionFilter', () => {
  const status = jest.fn<Response, [number]>();
  const json = jest.fn<Response, [ErrorResponseBody]>();
  const request = {
    method: 'GET',
    url: '/api/v1/recommended-routes/%20',
  } as Request;
  const response = {
    status,
    json,
  } as unknown as Response;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    status.mockReturnValue(response);
  });

  it('formats HttpException response with request context', () => {
    const filter = new HttpExceptionFilter();

    filter.catch(new BadRequestException('루트 ID가 유효하지 않습니다.'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/api/v1/recommended-routes/%20',
        method: 'GET',
        message: '루트 ID가 유효하지 않습니다.',
        error: 'Bad Request',
      }),
    );
    const responseBody = json.mock.calls[0]?.[0];
    expect(responseBody?.timestamp).toEqual(expect.any(String));
  });

  it('hides unknown exception details behind a 500 response', () => {
    const filter = new HttpExceptionFilter();

    filter.catch(new Error('database password leaked'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/api/v1/recommended-routes/%20',
        method: 'GET',
        message: '서버 내부 오류가 발생했습니다.',
        error: 'Internal Server Error',
      }),
    );
  });
});
