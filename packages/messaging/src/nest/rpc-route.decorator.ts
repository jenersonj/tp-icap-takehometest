import {
  applyDecorators,
  createParamDecorator,
  Injectable,
  UseInterceptors,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { Observable, catchError, map, of } from 'rxjs';

import { runWithCorrelationId } from '../core/correlation';
import { errorReply, isMessageEnvelope, okReply, type RpcReply } from '../core/envelope';
import { toRpcErrorBody } from '../core/errors';
import type { MessageContext } from '../core/message-bus';

/**
 * Wraps a Nest `@MessagePattern` handler so it speaks the bus envelope: the handler
 * returns plain data or throws a CodedError, and the caller gets an RpcReply.
 */
@Injectable()
export class RpcEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<RpcReply<unknown>> {
    const data: unknown = context.switchToRpc().getData();
    if (!isMessageEnvelope(data)) {
      return of(errorReply({ code: 'BAD_REQUEST', message: 'Message is not an envelope' }));
    }
    return new Observable<unknown>((subscriber) =>
      runWithCorrelationId(data.correlationId, () => next.handle().subscribe(subscriber)),
    ).pipe(
      map((result) => okReply(result)),
      catchError((error: unknown) => of(errorReply(toRpcErrorBody(error)))),
    );
  }
}

/** Runs an `@EventPattern` handler inside the message's correlation id. */
@Injectable()
export class EventEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const data: unknown = context.switchToRpc().getData();
    if (!isMessageEnvelope(data)) return of(undefined);
    return new Observable<unknown>((subscriber) =>
      runWithCorrelationId(data.correlationId, () => next.handle().subscribe(subscriber)),
    );
  }
}

/** `@RpcRoute('trade.create')` on a controller method answers that RPC pattern. */
export const RpcRoute = (pattern: string): MethodDecorator =>
  applyDecorators(MessagePattern(pattern), UseInterceptors(RpcEnvelopeInterceptor));

/** `@EventRoute('realtime.emitToGroup')` consumes that fire-and-forget topic. */
export const EventRoute = (topic: string): MethodDecorator =>
  applyDecorators(EventPattern(topic), UseInterceptors(EventEnvelopeInterceptor));

/** The envelope's payload (the request body of the RPC). */
export const RpcPayload = createParamDecorator((_: unknown, ctx: ExecutionContext): unknown => {
  const data: unknown = ctx.switchToRpc().getData();
  return isMessageEnvelope(data) ? data.payload : undefined;
});

/** The envelope's metadata (pattern, correlation id, sent time). */
export const RpcMeta = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): MessageContext | undefined => {
    const data: unknown = ctx.switchToRpc().getData();
    return isMessageEnvelope(data)
      ? { pattern: data.pattern, correlationId: data.correlationId, sentAt: data.sentAt }
      : undefined;
  },
);
