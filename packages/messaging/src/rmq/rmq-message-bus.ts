import { ClientRMQ, ServerRMQ, type RmqOptions } from '@nestjs/microservices';
import { TimeoutError, firstValueFrom, lastValueFrom, timeout } from 'rxjs';

import { currentCorrelationId, newCorrelationId } from '../core/correlation';
import { dispatchEvent, dispatchRequest, type DispatchLogger } from '../core/dispatch';
import { isMessageEnvelope, isRpcReply, type MessageEnvelope } from '../core/envelope';
import { MessageTimeoutError, RemoteError, TransportError } from '../core/errors';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  type EventHandler,
  type MessageBus,
  type PublishOptions,
  type RequestHandler,
  type RequestOptions,
} from '../core/message-bus';

export interface RmqMessageBusOptions {
  /** e.g. amqp://guest:guest@rabbitmq:5672 */
  urls: string[];
  /** Topic exchange every message is published to, routed by pattern. */
  exchange: string;
  /**
   * Queue this app consumes from. Its bindings are the patterns and topics registered with
   * handle()/subscribe() (and any @RpcRoute/@EventRoute controllers). Omit for a pure client.
   */
  consumerQueue?: string;
  prefetchCount?: number;
  defaultTimeoutMs?: number;
  logger?: DispatchLogger;
}

type NestRmqOptions = NonNullable<RmqOptions['options']>;

/**
 * RabbitMQ adapter built on Nest's own RMQ transport (`@nestjs/microservices`).
 *
 * - `request` uses ClientRMQ.send: RabbitMQ direct reply-to plus a correlation id.
 * - `publish` uses ClientRMQ.emit: persistent, fire and forget.
 * - Both go to one topic exchange with the pattern as routing key (`wildcards: true`), so
 *   each consumer queue receives only the patterns it registered.
 * - `handle`/`subscribe` register handlers on a ServerRMQ, which Nest starts through
 *   `app.connectMicroservice({ strategy: bus.consumer })` or {@link listen}.
 */
export class RmqMessageBus implements MessageBus {
  private readonly client: ClientRMQ;
  private readonly server: ServerRMQ | undefined;
  private readonly defaultTimeoutMs: number;
  private readonly subscribers = new Map<string, EventHandler<unknown>[]>();
  private clientConnected = false;
  private consumerListening = false;

  constructor(private readonly options: RmqMessageBusOptions) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const shared: NestRmqOptions = {
      urls: options.urls,
      exchange: options.exchange,
      exchangeType: 'topic',
      wildcards: true,
      persistent: true,
    };
    this.client = new ClientRMQ({ ...shared, queue: `${options.exchange}.client` });
    this.client.status.subscribe((status) => {
      this.clientConnected = status === 'connected';
    });
    if (options.consumerQueue) {
      this.server = new ServerRMQ({
        ...shared,
        queue: options.consumerQueue,
        queueOptions: { durable: true },
        prefetchCount: options.prefetchCount ?? 20,
        // Auto-ack: an RPC whose handler dies mid-flight times out at the caller, which is
        // the behaviour the API wants (it maps to 504) rather than a redelivery.
        noAck: true,
      });
      this.server.status.subscribe((status) => {
        this.consumerListening = status === 'connected';
      });
    }
  }

  /** The Nest transport strategy to pass to `connectMicroservice({ strategy })`. */
  get consumer(): ServerRMQ {
    if (!this.server) throw new Error('RmqMessageBus was created without a consumerQueue');
    return this.server;
  }

  /** Starts consuming without a Nest app (scripts and tests). */
  async listen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.consumer.listen((err?: unknown) => (err ? reject(err) : resolve()));
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.clientConnected = true;
  }

  /** True when the publisher is connected and, for consumers, the consumer is too. */
  isHealthy(): boolean {
    return this.clientConnected && (this.server === undefined || this.consumerListening);
  }

  async request<TReq, TRes>(
    pattern: string,
    payload: TReq,
    opts: RequestOptions = {},
  ): Promise<TRes> {
    const envelope = this.envelope(pattern, payload, opts.correlationId);
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    let reply: unknown;
    try {
      reply = await firstValueFrom(this.client.send(pattern, envelope).pipe(timeout(timeoutMs)));
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new MessageTimeoutError(pattern, timeoutMs, envelope.correlationId);
      }
      throw new TransportError(pattern, error);
    }
    if (!isRpcReply(reply)) {
      throw new TransportError(pattern, new Error('reply is not an RPC envelope'));
    }
    if (reply.ok) return reply.data as TRes;
    throw new RemoteError(reply.error, pattern, envelope.correlationId);
  }

  async publish<T>(topic: string, payload: T, opts: PublishOptions = {}): Promise<void> {
    const envelope = this.envelope(topic, payload, opts.correlationId);
    try {
      await lastValueFrom(this.client.emit(topic, envelope), { defaultValue: undefined });
    } catch (error) {
      throw new TransportError(topic, error);
    }
  }

  handle<TReq, TRes>(pattern: string, handler: RequestHandler<TReq, TRes>): void {
    const server = this.consumer;
    if (server.getHandlerByPattern(pattern)) {
      throw new Error(`A handler for "${pattern}" is already registered`);
    }
    server.addHandler(
      pattern,
      async (data: unknown) => {
        if (!isMessageEnvelope(data)) {
          return {
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Message is not an envelope' },
          };
        }
        return dispatchRequest(data as MessageEnvelope<TReq>, handler, this.options.logger);
      },
      false,
    );
  }

  subscribe<T>(topic: string, handler: EventHandler<T>): void {
    const existing = this.subscribers.get(topic);
    if (existing) {
      existing.push(handler as EventHandler<unknown>);
      return;
    }
    const handlers: EventHandler<unknown>[] = [handler as EventHandler<unknown>];
    this.subscribers.set(topic, handlers);
    this.consumer.addHandler(
      topic,
      async (data: unknown) => {
        if (!isMessageEnvelope(data)) return;
        await dispatchEvent(data, handlers, this.options.logger);
      },
      true,
    );
  }

  async close(): Promise<void> {
    await this.client.close();
    if (this.server) await this.server.close();
  }

  private envelope<T>(pattern: string, payload: T, correlationId?: string): MessageEnvelope<T> {
    return {
      pattern,
      correlationId: correlationId ?? currentCorrelationId() ?? newCorrelationId(),
      sentAt: new Date().toISOString(),
      payload,
    };
  }
}

/** Logger adapter so dispatch failures go through Nest's Logger. */
export function nestDispatchLogger(logger: {
  error(message: string, ...rest: unknown[]): void;
}): DispatchLogger {
  return { error: (message, meta) => logger.error(message, meta) };
}
