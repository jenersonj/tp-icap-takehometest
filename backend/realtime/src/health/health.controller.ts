import { MESSAGE_BUS, RmqMessageBus, type MessageBus } from '@blotter/messaging';
import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('health')
export class HealthController {
  constructor(@Inject(MESSAGE_BUS) private readonly bus: MessageBus) {}

  /** 200 when connected to RabbitMQ (publisher and consumer), 503 otherwise. */
  @Get()
  check(@Res({ passthrough: true }) res: Response): {
    status: 'ok' | 'degraded';
    rabbitmq: boolean;
  } {
    const rabbitmq = this.bus instanceof RmqMessageBus ? this.bus.isHealthy() : true;
    if (!rabbitmq) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: rabbitmq ? 'ok' : 'degraded', rabbitmq };
  }
}
