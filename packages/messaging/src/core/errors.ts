import type { RpcErrorBody } from './envelope';

/** Codes produced by the messaging layer itself (domain codes come from the handlers). */
export const MessagingErrorCode = {
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

/**
 * Base class for errors that should cross the bus with a code. A handler throws one (or a
 * subclass such as a DomainError) and the caller receives a {@link RemoteError} with the
 * same code, message and details.
 */
export class CodedError extends Error {
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
 * Turns anything a handler throws into a reply body. CodedErrors keep their code; anything
 * else becomes INTERNAL with a generic message so internals never leak to callers.
 */
export function toRpcErrorBody(error: unknown): RpcErrorBody {
  if (error instanceof CodedError) {
    return error.details === undefined
      ? { code: error.code, message: error.message }
      : { code: error.code, message: error.message, details: error.details };
  }
  return { code: MessagingErrorCode.INTERNAL, message: 'Internal error' };
}
