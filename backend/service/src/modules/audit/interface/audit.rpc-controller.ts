import {
  AuditPatterns,
  type AuditEntryRecord,
  type ListAuditForTradeRequest,
} from '@blotter/contracts';
import { RpcPayload, RpcRoute } from '@blotter/messaging';
import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { z } from 'zod';

import { parse } from '../../../shared/interface/parse-payload.js';
import { ListAuditForTradeQuery } from '../application/list-audit-for-trade.query.js';

const Schema = z.object({ tradeId: z.uuid() });

@Controller()
export class AuditRpcController {
  constructor(private readonly queries: QueryBus) {}

  @RpcRoute(AuditPatterns.LIST_FOR_TRADE)
  listForTrade(@RpcPayload() payload: ListAuditForTradeRequest): Promise<AuditEntryRecord[]> {
    const { tradeId } = parse(Schema, payload);
    return this.queries.execute(new ListAuditForTradeQuery(tradeId));
  }
}
