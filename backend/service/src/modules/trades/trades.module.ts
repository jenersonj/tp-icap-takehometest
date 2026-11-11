import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module.js';
import { AmendTradeHandler } from './application/commands/amend-trade.command.js';
import { CancelTradeHandler } from './application/commands/cancel-trade.command.js';
import { CreateTradeHandler } from './application/commands/create-trade.command.js';
import { NotifyRealtimeOnTradeChange } from './application/event-handlers/notify-realtime.handler.js';
import { TRADE_READ_MODEL } from './application/ports/trade-read-model.port.js';
import { GetTradeHandler } from './application/queries/get-trade.query.js';
import { ListTradesHandler } from './application/queries/list-trades.query.js';
import { TradeCommandRunner } from './application/trade-command-runner.js';
import { TRADE_REPOSITORY } from './domain/trade.repository.js';
import { PrismaTradeReadModel } from './infrastructure/prisma-trade.read-model.js';
import { PrismaTradeRepository } from './infrastructure/prisma-trade.repository.js';
import { TradesRpcController } from './interface/trades.rpc-controller.js';

@Module({
  imports: [AuditModule],
  controllers: [TradesRpcController],
  providers: [
    TradeCommandRunner,
    CreateTradeHandler,
    AmendTradeHandler,
    CancelTradeHandler,
    ListTradesHandler,
    GetTradeHandler,
    NotifyRealtimeOnTradeChange,
    { provide: TRADE_REPOSITORY, useClass: PrismaTradeRepository },
    { provide: TRADE_READ_MODEL, useClass: PrismaTradeReadModel },
  ],
})
export class TradesModule {}
