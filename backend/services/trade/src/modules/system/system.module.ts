import { Module } from '@nestjs/common';

import { SystemRpcController } from './interface/system.rpc-controller.js';

@Module({ controllers: [SystemRpcController] })
export class SystemModule {}
