import type { TradeRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { DomainError } from '../../../../shared/domain/domain-error.js';
import { TRADE_READ_MODEL, type TradeReadModel } from '../ports/trade-read-model.port.js';

export class GetTradeQuery {
  constructor(readonly id: string) {}
}

@QueryHandler(GetTradeQuery)
export class GetTradeHandler implements IQueryHandler<GetTradeQuery, TradeRecord> {
  constructor(@Inject(TRADE_READ_MODEL) private readonly readModel: TradeReadModel) {}

  async execute({ id }: GetTradeQuery): Promise<TradeRecord> {
    const trade = await this.readModel.get(id);
    if (!trade) throw DomainError.notFound('Trade', id);
    return trade;
  }
}
