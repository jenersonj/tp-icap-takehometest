import {
  RealtimeCommands,
  type RealtimeCommandMap,
  type RealtimeEventMap,
  type RealtimeEventName,
  type RealtimeGroup,
} from '@blotter/contracts';
import { MESSAGE_BUS, type MessageBus } from '@blotter/messaging';
import { Inject, Injectable } from '@nestjs/common';

import type { RealtimePublisher } from '../../application/realtime-publisher.js';

/** RealtimePublisher over the MessageBus: each emit is a fire-and-forget command to realtime. */
@Injectable()
export class BusRealtimePublisher implements RealtimePublisher {
  constructor(@Inject(MESSAGE_BUS) private readonly bus: MessageBus) {}

  emitToGroup<E extends RealtimeEventName>(
    group: RealtimeGroup,
    event: E,
    data: RealtimeEventMap[E],
  ): Promise<void> {
    return this.send(RealtimeCommands.EMIT_TO_GROUP, { group, event, data });
  }

  emitToClient<E extends RealtimeEventName>(
    socketId: string,
    event: E,
    data: RealtimeEventMap[E],
  ): Promise<void> {
    return this.send(RealtimeCommands.EMIT_TO_CLIENT, { socketId, event, data });
  }

  broadcast<E extends RealtimeEventName>(event: E, data: RealtimeEventMap[E]): Promise<void> {
    return this.send(RealtimeCommands.BROADCAST, { event, data });
  }

  private send<C extends keyof RealtimeCommandMap>(
    command: C,
    payload: RealtimeCommandMap[C],
  ): Promise<void> {
    return this.bus.publish(command, payload);
  }
}
