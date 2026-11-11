import { runWithCorrelationId } from './correlation';
import { errorReply, okReply, type MessageEnvelope, type RpcReply } from './envelope';
import { toRpcErrorBody } from './errors';
import type { EventHandler, MessageContext, RequestHandler } from './message-bus';

export interface DispatchLogger {
  error(message: string, meta?: Record<string, unknown>): void;
}

function contextOf(envelope: MessageEnvelope): MessageContext {
  return {
    pattern: envelope.pattern,
    correlationId: envelope.correlationId,
    sentAt: envelope.sentAt,
  };
}

/** Runs a request handler for one envelope and always produces an RpcReply (never throws). */
export async function dispatchRequest<TReq, TRes>(
  envelope: MessageEnvelope<TReq>,
  handler: RequestHandler<TReq, TRes>,
  logger?: DispatchLogger,
): Promise<RpcReply<TRes>> {
  return runWithCorrelationId(envelope.correlationId, async () => {
    try {
      return okReply(await handler(envelope.payload, contextOf(envelope)));
    } catch (error) {
      const body = toRpcErrorBody(error);
      if (body.code === 'INTERNAL') {
        logger?.error(`Handler for "${envelope.pattern}" failed`, {
          correlationId: envelope.correlationId,
          error: error instanceof Error ? error.stack : String(error),
        });
      }
      return errorReply(body);
    }
  });
}

/** Runs every event handler for one envelope; a failing handler is logged, not rethrown. */
export async function dispatchEvent<T>(
  envelope: MessageEnvelope<T>,
  handlers: readonly EventHandler<T>[],
  logger?: DispatchLogger,
): Promise<void> {
  await runWithCorrelationId(envelope.correlationId, async () => {
    const results = await Promise.allSettled(
      handlers.map((h) => h(envelope.payload, contextOf(envelope))),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        logger?.error(`Event handler for "${envelope.pattern}" failed`, {
          correlationId: envelope.correlationId,
          error: result.reason instanceof Error ? result.reason.stack : String(result.reason),
        });
      }
    }
  });
}
