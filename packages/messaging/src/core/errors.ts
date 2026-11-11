import type { RpcErrorBody } from './envelope.js';

/** Codes produced by the messaging layer itself (domain codes come from the handlers). */
export const MessagingErrorCode = {
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

/**
 * Errors carrying this brand (a global symbol, so no import is needed) cross the bus with
 * their code and message. It lets a service's domain layer define its own error type
 * without depending on this package.
 */
export const CODED_ERROR_BRAND = Symbol.for('blotter.coded-error');

export interface CodedErrorLike extends Error {
  readonly code: string;
  readonly details?: unknown;
}

export function isCodedError(error: unknown): error is CodedErrorLike {
  return (
    error instanceof Error &&
    (error as unknown as Record<symbol, unknown>)[CODED_ERROR_BRAND] === true &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

/**
 * Base class for errors that should cross the bus with a code. A handler throws one (or a
 * subclass such as a DomainError) and the caller receives a {@link RemoteError} with the
 * same code, message and details.
 */
export class CodedError extends Error {
  readonly [CODED_ERROR_BRAND] = true;

  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown by `request()` when the handler replied with `{ ok: false }`. */
export class RemoteError extends CodedError {
  constructor(
    body: RpcErrorBody,
    readonly pattern: string,
    readonly correlationId: string,
  ) {
    super(body.code, body.message, body.details);
  }
}

/** Thrown by `request()` when no reply arrives in time. */
export class MessageTimeoutError extends CodedError {
  constructor(
    readonly pattern: string,
    readonly timeoutMs: number,
    readonly correlationId: string,
  ) {
    super(MessagingErrorCode.TIMEOUT, `No reply to "${pattern}" within ${timeoutMs} ms`);
  }
}

/** Thrown when the broker cannot be reached or rejects the message. */
export class TransportError extends CodedError {
  constructor(
    readonly pattern: string,
    cause: unknown,
  ) {
    super(
      MessagingErrorCode.SERVICE_UNAVAILABLE,
      `Could not deliver "${pattern}": ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.cause = cause;
  }
}

/**
 * Turns anything a handler throws into a reply body. Branded (coded) errors keep their code; anything
 * else becomes INTERNAL with a generic message so internals never leak to callers.
 */
export function toRpcErrorBody(error: unknown): RpcErrorBody {
  if (isCodedError(error)) {
    return error.details === undefined
      ? { code: error.code, message: error.message }
      : { code: error.code, message: error.message, details: error.details };
  }
  return { code: MessagingErrorCode.INTERNAL, message: 'Internal error' };
}
