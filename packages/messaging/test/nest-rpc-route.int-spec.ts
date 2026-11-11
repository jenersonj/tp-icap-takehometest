import 'reflect-metadata';

import { Controller, Module, type INestMicroservice } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { currentCorrelationId, runWithCorrelationId } from '../src/core/correlation';
import { CodedError } from '../src/core/errors';
import { RpcMeta, RpcPayload, RpcRoute } from '../src/nest/rpc-route.decorator';
import { RmqMessageBus } from '../src/rmq/rmq-message-bus';
import type { MessageContext } from '../src/core/message-bus';

@Controller()
class GreetingController {
  @RpcRoute('greeting.say')
  say(@RpcPayload() payload: { name: string }, @RpcMeta() meta: MessageContext) {
    if (!payload.name) throw new CodedError('VALIDATION_FAILED', 'name is required');
    return {
      text: `hello ${payload.name}`,
      correlationId: meta.correlationId,
      ambient: currentCorrelationId(),
    };
  }
}

@Module({ controllers: [GreetingController] })
class GreetingModule {}

/** A Nest @RpcRoute controller served through the bus's ServerRMQ strategy. */
describe('@RpcRoute controllers on RmqMessageBus', () => {
  let container: StartedRabbitMQContainer;
  let app: INestMicroservice;
  let client: RmqMessageBus;

  beforeAll(async () => {
    container = await new RabbitMQContainer('rabbitmq:3-management').start();
    const urls = [container.getAmqpUrl()];
    const serverBus = new RmqMessageBus({
      urls,
      exchange: 'blotter.nest',
      consumerQueue: 'nest.rpc',
    });
    app = await NestFactory.createMicroservice(GreetingModule, {
      strategy: serverBus.consumer,
      logger: false,
    });
    await app.listen();
    client = new RmqMessageBus({ urls, exchange: 'blotter.nest' });
    await client.connect();
  });

  afterAll(async () => {
    await client?.close();
    await app?.close();
    await container?.stop();
  });

  it('unwraps the envelope, keeps the correlation id and wraps the reply', async () => {
    const reply = await runWithCorrelationId('corr-nest-1', () =>
      client.request<{ name: string }, { text: string; correlationId: string; ambient?: string }>(
        'greeting.say',
        {
          name: 'Jenerson',
        },
      ),
    );
    expect(reply).toEqual({
      text: 'hello Jenerson',
      correlationId: 'corr-nest-1',
      ambient: 'corr-nest-1',
    });
  });

  it('maps thrown CodedErrors to the error envelope', async () => {
    await expect(client.request('greeting.say', { name: '' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });
});
