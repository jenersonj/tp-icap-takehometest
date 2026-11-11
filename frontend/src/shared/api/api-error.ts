import type { ApiErrorBody, ErrorCode, FieldIssue } from '@blotter/contracts';

/** An error reply from /api/v1, typed from the shared error body. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK';
  readonly details: FieldIssue[];
  readonly correlationId: string | undefined;

  constructor(body: Pick<ApiErrorBody, 'statusCode' | 'message'> & Partial<ApiErrorBody>) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.code = body.code ?? 'INTERNAL';
    this.details = body.details ?? [];
    this.correlationId = body.correlationId;
  }

  static network(cause: unknown): ApiError {
    const error = new ApiError({
      statusCode: 0,
      message: 'Cannot reach the server. Check your connection and try again.',
    });
    (error as { code: string }).code = 'NETWORK';
    error.cause = cause;
    return error;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isConflict(): boolean {
    return this.code === 'VERSION_CONFLICT';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Message for a toast: the server's message, or a generic one. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong';
}
