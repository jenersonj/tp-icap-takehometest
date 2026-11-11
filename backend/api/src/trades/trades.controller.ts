import {
  AmendTradeInputSchema,
  AuditPatterns,
  AuthCookies,
  CancelTradeInputSchema,
  CreateTradeInputSchema,
  ListTradesQuerySchema,
  TradeIdParamSchema,
  TradePatterns,
  type Actor,
  type AuditEntryDto,
  type TradeDto,
  type TradePageDto,
} from '@blotter/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentActor } from '../shared/auth/decorators.js';
import { RpcClient } from '../shared/rpc-client.js';
import { validate } from '../shared/validate.js';
import { ApiZodBody } from '../shared/zod-openapi.js';
import { toAuditEntryDto, toTradeDto, toTradePageDto } from './trade.mapper.js';

/** Each route is one RPC; the Actor from the session guard goes with every command. */
@ApiTags('trades')
@ApiCookieAuth(AuthCookies.ACCESS_TOKEN)
@Controller({ path: 'trades', version: '1' })
export class TradesController {
  constructor(private readonly rpc: RpcClient) {}

  @Get()
  @ApiOperation({
    summary: 'List trades: ?status&side&symbol&book&trader&counterparty&from&to&sort&page&pageSize',
  })
  async list(@Query() query: unknown): Promise<TradePageDto> {
    const page = await this.rpc.request(TradePatterns.LIST, validate(ListTradesQuerySchema, query));
    return toTradePageDto(page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One trade' })
  async get(@Param() params: unknown): Promise<TradeDto> {
    const { id } = validate(TradeIdParamSchema, params);
    return toTradeDto(await this.rpc.request(TradePatterns.GET, { id }));
  }

  @Post()
  @ApiOperation({ summary: 'Book a trade' })
  @ApiZodBody(CreateTradeInputSchema)
  async create(@CurrentActor() actor: Actor, @Body() body: unknown): Promise<TradeDto> {
    const input = validate(CreateTradeInputSchema, body);
    return toTradeDto(await this.rpc.request(TradePatterns.CREATE, { actor, input }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Amend a trade; 409 when `version` is stale' })
  @ApiZodBody(AmendTradeInputSchema)
  async amend(
    @CurrentActor() actor: Actor,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<TradeDto> {
    const { id } = validate(TradeIdParamSchema, params);
    const { version, changes } = validate(AmendTradeInputSchema, body);
    return toTradeDto(await this.rpc.request(TradePatterns.AMEND, { actor, id, version, changes }));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a trade (final); 409 when `version` is stale' })
  @ApiZodBody(CancelTradeInputSchema)
  async cancel(
    @CurrentActor() actor: Actor,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<TradeDto> {
    const { id } = validate(TradeIdParamSchema, params);
    const { version, reason } = validate(CancelTradeInputSchema, body ?? {});
    const request = reason === undefined ? { actor, id, version } : { actor, id, version, reason };
    return toTradeDto(await this.rpc.request(TradePatterns.CANCEL, request));
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Audit trail of a trade, oldest first' })
  async audit(@Param() params: unknown): Promise<AuditEntryDto[]> {
    const { id } = validate(TradeIdParamSchema, params);
    const entries = await this.rpc.request(AuditPatterns.LIST_FOR_TRADE, { tradeId: id });
    return entries.map(toAuditEntryDto);
  }
}
