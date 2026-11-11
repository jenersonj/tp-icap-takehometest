import {
  AuthCookies,
  ListPricesQuerySchema,
  PricePatterns,
  type PriceDto,
} from '@blotter/contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RpcClient } from '../shared/rpc-client.js';
import { validate } from '../shared/validate.js';

@ApiTags('prices')
@ApiCookieAuth(AuthCookies.ACCESS_TOKEN)
@Controller({ path: 'prices', version: '1' })
export class PricesController {
  constructor(private readonly rpc: RpcClient) {}

  @Get()
  @ApiOperation({ summary: 'Latest mock market prices (?symbols=AAPL,MSFT)' })
  async list(@Query() query: unknown): Promise<PriceDto[]> {
    const { symbols } = validate(ListPricesQuerySchema, query);
    const prices = await this.rpc.request(PricePatterns.LIST, symbols ? { symbols } : {});
    return prices.map((p) => ({ symbol: p.symbol, price: Number(p.price), asOf: p.asOf }));
  }
}
