import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CodedError, MessageTimeoutError, RemoteError } from '../src/core/errors';
import { RmqMessageBus } from '../src/rmq/rmq-message-bus';

/**
 * Proves the RabbitMQ adapter against a real broker: request/reply, error envelopes,
 * fire-and-forget events, and that the topic exchange routes each pattern only to the
 * queue that registered it (service vs realtime).
 */
describe('RmqMessageBus (RabbitMQ)', () => {
  let container: StartedRabbitMQContainer;
  let service: RmqMessageBus;
  let realtime: RmqMessageBus;
  let api: RmqMessageBus;
  const realtimeSeen: unknown[] = [];
  const serviceSeenEvents: unknown[] = [];

  beforeAll(async () => {
    container = await new RabbitMQContainer('rabbitmq:3-management').start();
    const urls = [container.getAmqpUrl()];
    const exchange = 'blotter.test';

    service = new RmqMessageBus({ urls, exchange, consumerQueue: 'test.service.rpc' });
    service.handle<{ a: number; b: number }, number>('math.add', async ({ a, b }) => a + b);
    service.handle('trade.amend', async () => {
      throw new CodedError('VERSION_CONFLICT', 'stale version', { current: 2 });
    });
    service.handle(
      'slow.op',
      () => new Promise((resolve) => setTimeout(() => resolve('late'), 1_000)),
    );
    service.subscribe('audit.noted', async (payload) => void serviceSeenEvents.push(payload));

    realtime = new RmqMessageBus({ urls, exchange, consumerQueue: 'test.realtime.commands' });
    realtime.subscribe('realtime.emitToGroup', async (payload) => void realtimeSeen.push(payload));

    api = new RmqMessageBus({ urls, exchange });

    await Promise.all([service.listen(), realtime.listen()]);
    await Promise.all([service.connect(), realtime.connect(), api.connect()]);
  });

  afterAll(async () => {
    for (const bus of [api, service, realtime]) await bus?.close();
    await container?.stop();
  });

  it('answers a request with the handler result', async () => {
    await expect(api.request('math.add', { a: 20, b: 22 })).resolves.toBe(42);
  });

  it('turns a handler error into a RemoteError with the same code', async () => {
    const error = await api.request('trade.amend', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RemoteError);
    expect(error).toMatchObject({ code: 'VERSION_CONFLICT', details: { current: 2 } });
  });

  it('times out when the reply is late', async () => {
    await expect(api.request('slow.op', {}, { timeoutMs: 200 })).rejects.toBeInstanceOf(
      MessageTimeoutError,
    );
  });

  it('times out when no queue is bound to the pattern', async () => {
    await expect(api.request('nobody.listens', {}, { timeoutMs: 300 })).rejects.toBeInstanceOf(
      MessageTimeoutError,
    );
  });

  it('routes realtime commands to realtime only, and events to the subscribing queue', async () => {
    await service.publish('realtime.emitToGroup', {
      group: 'trades',
      event: 'trade.created',
      data: { id: 't1' },
    });
    await api.publish('audit.noted', { id: 'a1' });
    await waitFor(() => realtimeSeen.length === 1 && serviceSeenEvents.length === 1);
    expect(realtimeSeen).toEqual([{ group: 'trades', event: 'trade.created', data: { id: 't1' } }]);
    expect(serviceSeenEvents).toEqual([{ id: 'a1' }]);
  });

  it('reports healthy connections', () => {
    expect(api.isHealthy()).toBe(true);
    expect(service.isHealthy()).toBe(true);
  });
});

async function waitFor(condition: () => boolean, timeoutMs = 5_000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 25));
  }
}
