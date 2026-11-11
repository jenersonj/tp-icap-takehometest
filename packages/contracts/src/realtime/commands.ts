import type { RealtimeEventMap, RealtimeEventName } from './event-catalogue';
import type { RealtimeGroup } from './groups';

/** Fire-and-forget commands the service publishes for realtime to execute. */
export const RealtimeCommands = {
  EMIT_TO_GROUP: 'realtime.emitToGroup',
  EMIT_TO_CLIENT: 'realtime.emitToClient',
  BROADCAST: 'realtime.broadcast',
} as const;
export type RealtimeCommandName = (typeof RealtimeCommands)[keyof typeof RealtimeCommands];

export interface EmitToGroupCommand<E extends RealtimeEventName = RealtimeEventName> {
  group: RealtimeGroup;
  event: E;
  data: RealtimeEventMap[E];
}

export interface EmitToClientCommand<E extends RealtimeEventName = RealtimeEventName> {
  socketId: string;
  event: E;
  data: RealtimeEventMap[E];
}

export interface BroadcastCommand<E extends RealtimeEventName = RealtimeEventName> {
  event: E;
  data: RealtimeEventMap[E];
}

export interface RealtimeCommandMap {
  [RealtimeCommands.EMIT_TO_GROUP]: EmitToGroupCommand;
  [RealtimeCommands.EMIT_TO_CLIENT]: EmitToClientCommand;
  [RealtimeCommands.BROADCAST]: BroadcastCommand;
}
