import { Module } from '@nestjs/common';

import { TRADE_AUDIT_LOG } from '../trades/application/ports/trade-audit-log.port.js';
import {
  AUDIT_READ_MODEL,
  ListAuditForTradeHandler,
} from './application/list-audit-for-trade.query.js';
import { PrismaAuditReadModel } from './infrastructure/prisma-audit.read-model.js';
import { PrismaTradeAuditLog } from './infrastructure/prisma-trade-audit-log.js';
import { AuditRpcController } from './interface/audit.rpc-controller.js';

@Module({
  controllers: [AuditRpcController],
  providers: [
    ListAuditForTradeHandler,
    { provide: AUDIT_READ_MODEL, useClass: PrismaAuditReadModel },
    { provide: TRADE_AUDIT_LOG, useClass: PrismaTradeAuditLog },
  ],
  exports: [TRADE_AUDIT_LOG],
})
export class AuditModule {}
