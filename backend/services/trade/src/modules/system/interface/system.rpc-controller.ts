import { SystemPatterns, type PingResponse } from '@blotter/contracts';
import { RpcRoute } from '@blotter/messaging';
import { Controller } from '@nestjs/common';

@Controller()
export class SystemRpcController {
  @RpcRoute(SystemPatterns.PING)
  ping(): PingResponse {
    return { service: 'service', status: 'ok', at: new Date().toISOString() };
  }
}
