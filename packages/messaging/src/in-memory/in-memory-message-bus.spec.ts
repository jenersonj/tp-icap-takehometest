import { describe, expect, it } from 'vitest';

import { currentCorrelationId, runWithCorrelationId } from '../core/correlation.js';
import { CodedError, MessageTimeoutError, RemoteError, TransportError } from '../core/errors.js';
import { TypedMessageBus } from '../core/typed-message-bus.js';
import { InMemoryMessageBus } from './in-memory-message-bus.js';

describe('InMemoryMessageBus', () => {
  it('returns the handler result for a request', async () => {
    const bus = new InMemoryMessageBus();
    bus.handle<{ a: number; b: number }, number>('math.add', async ({ a, b }) => a + b);
    await expect(bus.request('math.add', { a: 2, b: 3 })).resolves.toBe(5);
  });

  it('passes a coded error to the caller as a RemoteError with the same code and details', async () => {
    const bus = new InMemoryMessageBus();
    bus.handle('trade.amend', async () => {
      throw new CodedError('VERSION_CONFLICT', 'Trade was changed by someone else', { current: 4 });
    });
    const error = await bus.request('trade.amend', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RemoteError);
    expect(error).toMatchObject({
      code: 'VERSION_CONFLICT',
      details: { current: 4 },
      pattern: 'trade.amend',
    });
  });

  it('hides unexpected errors behind INTERNAL', async () => {
    const bus = new InMemoryMessageBus();
    bus.handle('boom', async () => {
      throw new Error('db password is hunter2');
    });
    await expect(bus.request('boom', {})).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'Internal error',
    });
  });

  it('fails with SERVICE_UNAVAILABLE when nobody handles the pattern', async () => {
    const bus = new InMemoryMessageBus();
    await expect(bus.request('nobody.home', {})).rejects.toBeInstanceOf(TransportError);
    await expect(bus.request('nobody.home', {})).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('times out slow handlers', async () => {
    const bus = new InMemoryMessageBus();
    bus.handle('slow', () => new Promise((resolve) => setTimeout(resolve, 200)));
    const error = await bus.request('slow', {}, { timeoutMs: 20 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MessageTimeoutError);
    expect(error).toMatchObject({ code: 'TIMEOUT' });
  });

  it('serialises payloads like the wire does', async () => {
    const bus = new InMemoryMessageBus();
    let received: unknown;
    bus.handle('echo', async (payload) => {
      received = payload;
      return { at: new Date('2026-01-01T00:00:00Z') };
    });
    const reply = await bus.request<{ when: Date }, { at: unknown }>('echo', {
      when: new Date('2026-08-18T09:15:23Z'),
    });
    expect(received).toEqual({ when: '2026-08-18T09:15:23.000Z' });
    expect(reply.at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('delivers published events to every subscriber and records them', async () => {
    const bus = new InMemoryMessageBus();
    const seen: string[] = [];
    bus.subscribe<{ id: string }>('trade.created', async ({ id }) => void seen.push(`a:${id}`));
    bus.subscribe<{ id: string }>('trade.created', async ({ id }) => void seen.push(`b:${id}`));
    await bus.publish('trade.created', { id: 't1' });
    await bus.flush();
    expect(seen.sort()).toEqual(['a:t1', 'b:t1']);
    expect(bus.publishedTo('trade.created')).toHaveLength(1);
  });

  it('keeps delivering when one subscriber throws', async () => {
    const bus = new InMemoryMessageBus();
    const seen: string[] = [];
    bus.subscribe('topic', async () => {
      throw new Error('nope');
    });
    bus.subscribe('topic', async () => void seen.push('ok'));
    await bus.publish('topic', {});
    await bus.flush();
    expect(seen).toEqual(['ok']);
  });

  it('propagates the correlation id from caller to handler to nested calls', async () => {
    const bus = new InMemoryMessageBus();
    const ids: (string | undefined)[] = [];
    bus.handle('outer', async (_payload, ctx) => {
      ids.push(ctx.correlationId, currentCorrelationId());
      await bus.publish('inner.event', {});
      return null;
    });
    await runWithCorrelationId('corr-123', () => bus.request('outer', {}));
    expect(ids).toEqual(['corr-123', 'corr-123']);
    expect(bus.publishedTo('inner.event')[0]?.correlationId).toBe('corr-123');
  });

  it('refuses a second handler for the same pattern', () => {
    const bus = new InMemoryMessageBus();
    bus.handle('dup', async () => 1);
    expect(() => bus.handle('dup', async () => 2)).toThrow(/already registered/);
  });

  it('works through TypedMessageBus', async () => {
    type Rpc = { 'user.get': { request: { id: string }; response: { name: string } } };
    const typed = new TypedMessageBus<Rpc>(new InMemoryMessageBus());
    typed.handle('user.get', async ({ id }) => ({ name: `user-${id}` }));
    await expect(typed.request('user.get', { id: '7' })).resolves.toEqual({ name: 'user-7' });
  });
});
