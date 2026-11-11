import {
  isRealtimeEventName,
  isRealtimeGroup,
  RealtimeCommands,
  type BroadcastCommand,
  type EmitToClientCommand,
  type EmitToGroupCommand,
} from '@blotter/contracts';
import { EventRoute, RpcPayload } from '@blotter/messaging';
import { Controller, Inject, Logger } from '@nestjs/common';

import { REALTIME_GATEWAY, type RealtimeGateway } from '../gateway/realtime-gateway.js';

/**
 * Consumes the fire-and-forget emit commands the service publishes. A command naming an
 * unknown group or event is dropped and logged, never delivered.
 */
@Controller()
export class RealtimeCommandsController {
  private readonly logger = new Logger(RealtimeCommandsController.name);

  constructor(@Inject(REALTIME_GATEWAY) private readonly gateway: RealtimeGateway) {}

  @EventRoute(RealtimeCommands.EMIT_TO_GROUP)
  emitToGroup(@RpcPayload() command: EmitToGroupCommand): void {
    if (!isRealtimeGroup(command?.group) || !isRealtimeEventName(command.event)) {
      return this.drop(RealtimeCommands.EMIT_TO_GROUP, command);
    }
    this.gateway.emitToGroup(command.group, command.event, command.data ?? {});
  }

  @EventRoute(RealtimeCommands.EMIT_TO_CLIENT)
  emitToClient(@RpcPayload() command: EmitToClientCommand): void {
    if (typeof command?.socketId !== 'string' || !isRealtimeEventName(command.event)) {
      return this.drop(RealtimeCommands.EMIT_TO_CLIENT, command);
    }
    this.gateway.emitToClient(command.socketId, command.event, command.data ?? {});
  }

  @EventRoute(RealtimeCommands.BROADCAST)
  broadcast(@RpcPayload() command: BroadcastCommand): void {
    if (!isRealtimeEventName(command?.event)) {
      return this.drop(RealtimeCommands.BROADCAST, command);
    }
    this.gateway.broadcast(command.event, command.data ?? {});
  }

  private drop(command: string, payload: unknown): void {
    this.logger.warn(`Dropped malformed ${command}: ${JSON.stringify(payload)?.slice(0, 200)}`);
  }
}
