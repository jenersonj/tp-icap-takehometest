import type { RealtimeEventMap, RealtimeEventName, RealtimeGroup } from '@blotter/contracts';

import type { RealtimePublisher } from '../src/shared/application/realtime-publisher.js';
import type { UnitOfWork } from '../src/shared/application/unit-of-work.js';

export interface RecordedEmit {
  target: string;
  event: RealtimeEventName;
  data: unknown;
}

/** Records every emit instead of sending it over the bus. */
export class RecordingRealtimePublisher implements RealtimePublisher {
  readonly emits: RecordedEmit[] = [];

  emitToGroup<E extends RealtimeEventName>(
    group: RealtimeGroup,
    event: E,
    data: RealtimeEventMap[E],
  ): Promise<void> {
    this.emits.push({ target: `group:${group}`, event, data });
    return Promise.resolve();
  }

  emitToClient<E extends RealtimeEventName>(
    socketId: string,
    event: E,
    data: RealtimeEventMap[E],
  ): Promise<void> {
    this.emits.push({ target: `client:${socketId}`, event, data });
    return Promise.resolve();
  }

  broadcast<E extends RealtimeEventName>(event: E, data: RealtimeEventMap[E]): Promise<void> {
    this.emits.push({ target: 'all', event, data });
    return Promise.resolve();
  }
}

/** Runs the work directly; in-memory fakes have nothing to roll back. */
export const passThroughUnitOfWork: UnitOfWork = { run: (work) => work() };
