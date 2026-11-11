import {
  ListPricesRequestSchema,
  PricePatterns,
  type ListPricesRequest,
  type PriceRecord,
} from '@blotter/contracts';
import { RpcPayload, RpcRoute } from '@blotter/messaging';
import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { parse } from '../../../shared/interface/parse-payload.js';
import { ListPricesQuery } from '../application/queries/list-prices.query.js';

@Controller()
export class PricingRpcController {
  constructor(private readonly queries: QueryBus) {}

  @RpcRoute(PricePatterns.LIST)
  list(@RpcPayload() payload: ListPricesRequest): Promise<PriceRecord[]> {
    const { symbols } = parse(ListPricesRequestSchema, payload ?? {});
    return this.queries.execute(new ListPricesQuery(symbols));
  }
}
