import { SystemPatterns, type RpcMap } from '@blotter/contracts';
import { MESSAGE_BUS, TypedMessageBus, type MessageBus } from '@blotter/messaging';
import { Controller, Get, HttpCode, HttpStatus, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Public } from '../shared/auth/decorators.js';

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: 'ok' | 'unreachable';
  at: string;
}

@Public()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  private readonly rpc: TypedMessageBus<RpcMap>;

  constructor(@Inject(MESSAGE_BUS) bus: MessageBus) {
    this.rpc = new TypedMessageBus<RpcMap>(bus);
  }

  /** 200 when the service answers a ping over RabbitMQ, 503 otherwise. */
  @Get()
  @HttpCode(HttpStatus.OK)
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const at = new Date().toISOString();
    try {
      await this.rpc.request(SystemPatterns.PING, {}, { timeoutMs: 2_000 });
      return { status: 'ok', service: 'ok', at };
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'degraded', service: 'unreachable', at };
    }
  }
}
