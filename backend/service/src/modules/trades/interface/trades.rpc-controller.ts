import {
  ActorSchema,
  AmendTradeInputSchema,
  CancelTradeInputSchema,
  CreateTradeRequestSchema,
  ListTradesRequestSchema,
  TradePatterns,
  type AmendTradeRequest,
  type CancelTradeRequest,
  type CreateTradeRequest,
  type GetTradeRequest,
  type ListTradesRequest,
  type TradePage,
  type TradeRecord,
} from '@blotter/contracts';
import { RpcPayload, RpcRoute } from '@blotter/messaging';
import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { z } from 'zod';

import { parse } from '../../../shared/interface/parse-payload.js';
import { AmendTradeCommand } from '../application/commands/amend-trade.command.js';
import { CancelTradeCommand } from '../application/commands/cancel-trade.command.js';
import { CreateTradeCommand } from '../application/commands/create-trade.command.js';
import { GetTradeQuery } from '../application/queries/get-trade.query.js';
import { ListTradesQuery } from '../application/queries/list-trades.query.js';

const IdSchema = z.object({ id: z.uuid() });
const AmendSchema = AmendTradeInputSchema.extend({ actor: ActorSchema, id: z.uuid() });
const CancelSchema = CancelTradeInputSchema.extend({ actor: ActorSchema, id: z.uuid() });

/**
 * RPC entry points for trades. The API validated the shape already; the payload is checked
 * again here because the queue is a trust boundary too.
 */
@Controller()
export class TradesRpcController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @RpcRoute(TradePatterns.LIST)
  list(@RpcPayload() payload: ListTradesRequest): Promise<TradePage> {
    return this.queries.execute(new ListTradesQuery(parse(ListTradesRequestSchema, payload)));
  }

  @RpcRoute(TradePatterns.GET)
  get(@RpcPayload() payload: GetTradeRequest): Promise<TradeRecord> {
    const { id } = parse(IdSchema, payload);
    return this.queries.execute(new GetTradeQuery(id));
  }

  @RpcRoute(TradePatterns.CREATE)
  create(@RpcPayload() payload: CreateTradeRequest): Promise<TradeRecord> {
    const { actor, input } = parse(CreateTradeRequestSchema, payload);
    return this.commands.execute(new CreateTradeCommand(actor, input));
  }

  @RpcRoute(TradePatterns.AMEND)
  amend(@RpcPayload() payload: AmendTradeRequest): Promise<TradeRecord> {
    const { actor, id, version, changes } = parse(AmendSchema, payload);
    return this.commands.execute(new AmendTradeCommand(actor, id, version, changes));
  }

  @RpcRoute(TradePatterns.CANCEL)
  cancel(@RpcPayload() payload: CancelTradeRequest): Promise<TradeRecord> {
    const { actor, id, version, reason } = parse(CancelSchema, payload);
    return this.commands.execute(new CancelTradeCommand(actor, id, version, reason));
  }
}
