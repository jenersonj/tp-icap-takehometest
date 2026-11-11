import type { ListTradesQuery as ListTradesParams, TradePage } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { TRADE_READ_MODEL, type TradeReadModel } from '../ports/trade-read-model.port.js';

export class ListTradesQuery {
  constructor(readonly params: ListTradesParams) {}
}

@QueryHandler(ListTradesQuery)
export class ListTradesHandler implements IQueryHandler<ListTradesQuery, TradePage> {
  constructor(@Inject(TRADE_READ_MODEL) private readonly readModel: TradeReadModel) {}

  execute({ params }: ListTradesQuery): Promise<TradePage> {
    return this.readModel.list(params);
  }
}
