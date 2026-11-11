/**
 * Wire format shared by every adapter. Requests and events carry a {@link MessageEnvelope};
 * RPC replies are always an {@link RpcReply}, never a thrown transport error, so the caller
 * can tell "the service said no" apart from "the service is unreachable".
 */
export interface MessageEnvelope<T = unknown> {
  /** Pattern (RPC) or topic (event) the message was sent to. */
  pattern: string;
  /** Propagated across hops for tracing; one id per user action. */
  correlationId: string;
  /** ISO timestamp when the sender created the message. */
  sentAt: string;
  payload: T;
}

export interface RpcErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export type RpcReply<T> = { ok: true; data: T } | { ok: false; error: RpcErrorBody };

export function okReply<T>(data: T): RpcReply<T> {
  return { ok: true, data };
}

export function errorReply(error: RpcErrorBody): RpcReply<never> {
  return { ok: false, error };
}

export function isMessageEnvelope(value: unknown): value is MessageEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MessageEnvelope).pattern === 'string' &&
    typeof (value as MessageEnvelope).correlationId === 'string' &&
    'payload' in value
  );
}

export function isRpcReply(value: unknown): value is RpcReply<unknown> {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false;
  const reply = value as RpcReply<unknown>;
  return reply.ok === true ? 'data' in reply : typeof reply.error?.code === 'string';
}
