import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type HttpExceptionResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

type ErrorResponseBody = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    if (!(exception instanceof HttpException)) {
      const errorMessage =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(errorMessage);
    }

    response.status(statusCode).json(
      this.buildResponseBody({
        statusCode,
        exceptionResponse,
        request,
      }),
    );
  }

  private buildResponseBody({
    statusCode,
    exceptionResponse,
    request,
  }: {
    statusCode: number;
    exceptionResponse: string | object | undefined;
    request: Request;
  }): ErrorResponseBody {
    const fallbackError =
      HttpStatus[statusCode] ?? HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR];

    if (typeof exceptionResponse === 'string') {
      return {
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: exceptionResponse,
        error: fallbackError,
      };
    }

    const normalizedResponse =
      this.normalizeExceptionResponse(exceptionResponse);

    return {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: normalizedResponse.message ?? fallbackError,
      error: normalizedResponse.error ?? fallbackError,
    };
  }

  private normalizeExceptionResponse(
    exceptionResponse: object | undefined,
  ): HttpExceptionResponse {
    if (!exceptionResponse) {
      return {
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
    }

    const response = exceptionResponse as HttpExceptionResponse;

    return {
      statusCode: response.statusCode,
      message: response.message,
      error: response.error,
    };
  }
}
