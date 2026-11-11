import {
  AuthCookies,
  ListPositionsQuerySchema,
  PositionPatterns,
  type PositionDto,
  type PositionRecord,
  type PositionSummaryDto,
} from '@blotter/contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RpcClient } from '../shared/rpc-client.js';
import { validate } from '../shared/validate.js';

const num = (value: string | null) => (value === null ? null : Number(value));
const round2 = (value: number) => Math.round(value * 100) / 100;

export function toPositionDto(record: PositionRecord): PositionDto {
  return {
    symbol: record.symbol,
    netQuantity: record.netQuantity,
    averagePrice: num(record.averagePrice),
    lastPrice: num(record.lastPrice),
    priceAsOf: record.priceAsOf,
    marketValue: num(record.marketValue),
    unrealisedPnl: num(record.unrealisedPnl),
    realisedPnl: Number(record.realisedPnl),
    tradeCount: record.tradeCount,
  };
}

/** Totals skip symbols that have no market price yet. */
export function toPositionSummaryDto(records: PositionRecord[]): PositionSummaryDto {
  const positions = records.map(toPositionDto);
  const sum = (pick: (p: PositionDto) => number | null) =>
    round2(positions.reduce((total, p) => total + (pick(p) ?? 0), 0));
  return {
    positions,
    totalUnrealisedPnl: sum((p) => p.unrealisedPnl),
    totalRealisedPnl: sum((p) => p.realisedPnl),
    totalMarketValue: sum((p) => p.marketValue),
  };
}

@ApiTags('positions')
@ApiCookieAuth(AuthCookies.ACCESS_TOKEN)
@Controller({ path: 'positions', version: '1' })
export class PositionsController {
  constructor(private readonly rpc: RpcClient) {}

  @Get()
  @ApiOperation({ summary: 'Net position and P&L by symbol (?book= to filter)' })
  async list(@Query() query: unknown): Promise<PositionSummaryDto> {
    const request = validate(ListPositionsQuerySchema, query);
    return toPositionSummaryDto(await this.rpc.request(PositionPatterns.LIST, request));
  }
}
