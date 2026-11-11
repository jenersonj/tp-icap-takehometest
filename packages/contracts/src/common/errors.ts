/**
 * Error codes shared by every hop. The service replies with one of these inside the
 * RPC error envelope; the API maps it to an HTTP status with {@link httpStatusFor}.
 */
export const ErrorCode = {
  /** Request shape is wrong (zod failure at the API edge). */
  BAD_REQUEST: 'BAD_REQUEST',
  /** A business rule rejected the request (domain validation in the service). */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  /** Optimistic concurrency: the caller's `version` is stale. */
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  /** The aggregate is in a state that does not allow the operation (e.g. amending a CANCELLED trade). */
  INVALID_STATE: 'INVALID_STATE',
  /** No reply from a downstream service within the timeout. */
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  INVALID_STATE: 409,
  TIMEOUT: 504,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && value in HTTP_STATUS;
}

/** Maps any error code (unknown codes become 500) to the HTTP status the API returns. */
export function httpStatusFor(code: string): number {
  return isErrorCode(code) ? HTTP_STATUS[code] : 500;
}

/** One field-level problem, used in `details` for BAD_REQUEST and VALIDATION_FAILED. */
export interface FieldIssue {
  path: string;
  message: string;
}

/** The JSON body of every error response from the HTTP API. */
export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: FieldIssue[];
  correlationId?: string;
}
