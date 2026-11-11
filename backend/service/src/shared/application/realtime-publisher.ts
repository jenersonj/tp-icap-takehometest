import type { RealtimeEventMap, RealtimeEventName, RealtimeGroup } from '@blotter/contracts';

/**
 * Port the service uses to tell the realtime server what to emit. The service decides the
 * event and its target; realtime only delivers.
 */
export interface RealtimePublisher {
  emitToGroup<E extends RealtimeEventName>(
    group: RealtimeGroup,
    event: E,
    data: RealtimeEventMap[E],
  ): Promise<void>;
  emitToClient<E extends RealtimeEventName>(
    socketId: string,
    event: E,
    data: RealtimeEventMap[E],
  ): Promise<void>;
  broadcast<E extends RealtimeEventName>(event: E, data: RealtimeEventMap[E]): Promise<void>;
}

export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');
