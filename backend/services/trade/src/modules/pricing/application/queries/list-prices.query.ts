import type { PriceRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PRICE_READ_MODEL, type PriceReadModel } from '../ports/price-read-model.port.js';

export class ListPricesQuery {
  constructor(readonly symbols?: readonly string[]) {}
}

@QueryHandler(ListPricesQuery)
export class ListPricesHandler implements IQueryHandler<ListPricesQuery, PriceRecord[]> {
  constructor(@Inject(PRICE_READ_MODEL) private readonly readModel: PriceReadModel) {}

  execute({ symbols }: ListPricesQuery): Promise<PriceRecord[]> {
    return this.readModel.list(symbols?.length ? symbols : undefined);
  }
}
