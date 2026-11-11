import type { RealtimeEventMap, RealtimeEventName, RealtimeGroup } from '@blotter/contracts';

/**
 * What realtime can do, independent of the socket library (Socket.IO is one adapter).
 * It only delivers: the service decides the event and its audience.
 */
export interface RealtimeGateway {
  emitToGroup<E extends RealtimeEventName>(
    group: RealtimeGroup,
    event: E,
    data: RealtimeEventMap[E],
  ): void;
  emitToClient<E extends RealtimeEventName>(
    socketId: string,
    event: E,
    data: RealtimeEventMap[E],
  ): void;
  broadcast<E extends RealtimeEventName>(event: E, data: RealtimeEventMap[E]): void;
}

export const REALTIME_GATEWAY = Symbol('REALTIME_GATEWAY');
