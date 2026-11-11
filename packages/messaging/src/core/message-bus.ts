export interface RequestOptions {
  /** Defaults to the adapter's `defaultTimeoutMs` (5 s, per ARCHITECTURE.md). */
  timeoutMs?: number;
  /** Overrides the ambient correlation id. */
  correlationId?: string;
}

export interface PublishOptions {
  correlationId?: string;
}

/** What a consumer knows about the message it is handling. */
export interface MessageContext {
  pattern: string;
  correlationId: string;
  sentAt: string;
}

export type RequestHandler<TReq, TRes> = (payload: TReq, ctx: MessageContext) => Promise<TRes>;
export type EventHandler<T> = (payload: T, ctx: MessageContext) => Promise<void>;

/**
 * The only way apps talk to each other. RabbitMQ is one adapter behind it and an in-memory
 * adapter backs unit tests, so no app code imports a broker client.
 */
export interface MessageBus {
  /** Request/response: resolves with the handler's result or rejects with a RemoteError/MessageTimeoutError. */
  request<TReq, TRes>(pattern: string, payload: TReq, opts?: RequestOptions): Promise<TRes>;
  /** Fire and forget: resolves once the broker has accepted the message. */
  publish<T>(topic: string, payload: T, opts?: PublishOptions): Promise<void>;
  /** Registers the handler that answers `pattern`. Register before the consumer starts listening. */
  handle<TReq, TRes>(pattern: string, handler: RequestHandler<TReq, TRes>): void;
  /** Registers a handler for events published on `topic`. */
  subscribe<T>(topic: string, handler: EventHandler<T>): void;
  close(): Promise<void>;
}

/** Nest injection token for the MessageBus. */
export const MESSAGE_BUS = Symbol('MESSAGE_BUS');

export const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
