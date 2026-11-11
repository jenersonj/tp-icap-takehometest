import { ErrorCode, httpStatusFor, isErrorCode, type ApiErrorBody } from '@blotter/contracts';
import { currentCorrelationId, isCodedError } from '@blotter/messaging';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

const CODE_FOR_STATUS: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHENTICATED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.INVALID_STATE,
  422: ErrorCode.VALIDATION_FAILED,
  503: ErrorCode.SERVICE_UNAVAILABLE,
  504: ErrorCode.TIMEOUT,
};

/**
 * One error shape for every response: `{statusCode, code, message, details?, correlationId}`.
 * Coded errors (service replies, validation, auth) keep their code and map to HTTP with
 * httpStatusFor; Nest HTTP errors (unknown route, bad JSON) get the matching code; anything
 * else is logged and returned as a generic 500.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(error);
    const correlationId = currentCorrelationId();
    res.status(body.statusCode).json(correlationId ? { ...body, correlationId } : body);
  }

  private toBody(error: unknown): ApiErrorBody {
    if (isCodedError(error)) {
      const code = isErrorCode(error.code) ? error.code : ErrorCode.INTERNAL;
      const statusCode = httpStatusFor(code);
      if (statusCode >= 500) this.logger.error(`${code}: ${error.message}`);
      const body: ApiErrorBody = {
        statusCode,
        code,
        message: statusCode === 500 ? 'Internal error' : error.message,
      };
      return Array.isArray(error.details) && statusCode < 500
        ? { ...body, details: error.details as ApiErrorBody['details'] }
        : body;
    }
    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      return {
        statusCode,
        code:
          CODE_FOR_STATUS[statusCode] ??
          (statusCode >= 500 ? ErrorCode.INTERNAL : ErrorCode.BAD_REQUEST),
        message: statusCode >= 500 ? 'Internal error' : error.message,
      };
    }
    this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL,
      message: 'Internal error',
    };
  }
}
