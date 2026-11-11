import { Module } from '@nestjs/common';

import { SystemRpcController } from './interface/system.rpc-controller';

@Module({ controllers: [SystemRpcController] })
export class SystemModule {}
