import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const storage = new AsyncLocalStorage<string>();

export function newCorrelationId(): string {
  return randomUUID();
}

/** Correlation id of the message being handled right now, if any. */
export function currentCorrelationId(): string | undefined {
  return storage.getStore();
}

/**
 * Runs `fn` with `correlationId` as the ambient id, so any request or publish made while
 * handling a message (or an HTTP request) carries the same id to the next hop.
 */
export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return storage.run(correlationId, fn);
}
