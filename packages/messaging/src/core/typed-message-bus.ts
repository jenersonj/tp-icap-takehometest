import type { MessageBus, MessageContext, PublishOptions, RequestOptions } from './message-bus';

/** A catalogue of request/reply patterns, e.g. `RpcMap` from @blotter/contracts. */
export type RpcCatalogue = Record<string, { request: unknown; response: unknown }>;
/** A catalogue of fire-and-forget topics and their payloads. */
export type TopicCatalogue = Record<string, unknown>;

/**
 * Type-safe view over a {@link MessageBus}: the pattern picks the request and reply types,
 * so `bus.request('trade.get', { id })` is checked end to end at compile time.
 */
export class TypedMessageBus<R extends RpcCatalogue, T extends TopicCatalogue = TopicCatalogue> {
  constructor(readonly bus: MessageBus) {}

  request<P extends keyof R & string>(
    pattern: P,
    payload: R[P]['request'],
    opts?: RequestOptions,
  ): Promise<R[P]['response']> {
    return this.bus.request<R[P]['request'], R[P]['response']>(pattern, payload, opts);
  }

  publish<K extends keyof T & string>(
    topic: K,
    payload: T[K],
    opts?: PublishOptions,
  ): Promise<void> {
    return this.bus.publish(topic, payload, opts);
  }

  handle<P extends keyof R & string>(
    pattern: P,
    handler: (payload: R[P]['request'], ctx: MessageContext) => Promise<R[P]['response']>,
  ): void {
    this.bus.handle(pattern, handler);
  }

  subscribe<K extends keyof T & string>(
    topic: K,
    handler: (payload: T[K], ctx: MessageContext) => Promise<void>,
  ): void {
    this.bus.subscribe(topic, handler);
  }
}
