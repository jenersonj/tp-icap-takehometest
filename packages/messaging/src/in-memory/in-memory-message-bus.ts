import { currentCorrelationId, newCorrelationId } from '../core/correlation.js';
import { dispatchEvent, dispatchRequest } from '../core/dispatch.js';
import { type MessageEnvelope } from '../core/envelope.js';
import { MessageTimeoutError, RemoteError, TransportError } from '../core/errors.js';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  type EventHandler,
  type MessageBus,
  type PublishOptions,
  type RequestHandler,
  type RequestOptions,
} from '../core/message-bus.js';

export interface PublishedMessage<T = unknown> {
  topic: string;
  payload: T;
  correlationId: string;
}

export interface InMemoryMessageBusOptions {
  defaultTimeoutMs?: number;
}

/**
 * In-process MessageBus for unit tests. It follows the RabbitMQ adapter's semantics:
 * payloads are JSON round-tripped (so Dates, Decimals and class instances behave as they
 * would on the wire), replies use the same envelope, and unknown patterns fail with
 * SERVICE_UNAVAILABLE. Every publish is recorded in {@link published} for assertions.
 */
export class InMemoryMessageBus implements MessageBus {
  readonly published: PublishedMessage[] = [];
  private readonly handlers = new Map<string, RequestHandler<unknown, unknown>>();
  private readonly subscribers = new Map<string, EventHandler<unknown>[]>();
  private readonly defaultTimeoutMs: number;
  private closed = false;

  constructor(options: InMemoryMessageBusOptions = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  async request<TReq, TRes>(
    pattern: string,
    payload: TReq,
    opts: RequestOptions = {},
  ): Promise<TRes> {
    this.assertOpen(pattern);
    const envelope = this.envelope(pattern, payload, opts.correlationId);
    const handler = this.handlers.get(pattern);
    if (!handler) {
      throw new TransportError(pattern, new Error(`no handler registered for "${pattern}"`));
    }
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new MessageTimeoutError(pattern, timeoutMs, envelope.correlationId)),
        timeoutMs,
      );
    });
    try {
      const reply = roundTrip(await Promise.race([dispatchRequest(envelope, handler), timeout]));
      if (reply.ok) return reply.data as TRes;
      throw new RemoteError(reply.error, pattern, envelope.correlationId);
    } finally {
      clearTimeout(timer);
    }
  }

  async publish<T>(topic: string, payload: T, opts: PublishOptions = {}): Promise<void> {
    this.assertOpen(topic);
    const envelope = this.envelope(topic, payload, opts.correlationId);
    this.published.push({
      topic,
      payload: envelope.payload,
      correlationId: envelope.correlationId,
    });
    const subscribers = this.subscribers.get(topic) ?? [];
    // Fire and forget, like the broker: the publisher does not wait for consumers.
    void dispatchEvent(envelope, subscribers);
  }

  handle<TReq, TRes>(pattern: string, handler: RequestHandler<TReq, TRes>): void {
    if (this.handlers.has(pattern)) {
      throw new Error(`A handler for "${pattern}" is already registered`);
    }
    this.handlers.set(pattern, handler as RequestHandler<unknown, unknown>);
  }

  subscribe<T>(topic: string, handler: EventHandler<T>): void {
    const list = this.subscribers.get(topic) ?? [];
    list.push(handler as EventHandler<unknown>);
    this.subscribers.set(topic, list);
  }

  /** Resolves once queued event handlers have run; useful after `publish` in tests. */
  async flush(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
  }

  publishedTo<T = unknown>(topic: string): PublishedMessage<T>[] {
    return this.published.filter((m) => m.topic === topic) as PublishedMessage<T>[];
  }

  clearPublished(): void {
    this.published.length = 0;
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  private envelope<T>(pattern: string, payload: T, correlationId?: string): MessageEnvelope<T> {
    return {
      pattern,
      correlationId: correlationId ?? currentCorrelationId() ?? newCorrelationId(),
      sentAt: new Date().toISOString(),
      payload: roundTrip(payload),
    };
  }

  private assertOpen(pattern: string): void {
    if (this.closed) throw new TransportError(pattern, new Error('bus is closed'));
  }
}

function roundTrip<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}
