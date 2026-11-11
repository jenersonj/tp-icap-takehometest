import {
  ListPositionsQuerySchema,
  PositionPatterns,
  type ListPositionsRequest,
  type PositionRecord,
} from '@blotter/contracts';
import { RpcPayload, RpcRoute } from '@blotter/messaging';
import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { parse } from '../../../shared/interface/parse-payload.js';
import { ListPositionsQuery } from '../application/queries/list-positions.query.js';

@Controller()
export class PositionsRpcController {
  constructor(private readonly queries: QueryBus) {}

  @RpcRoute(PositionPatterns.LIST)
  list(@RpcPayload() payload: ListPositionsRequest): Promise<PositionRecord[]> {
    const { book } = parse(ListPositionsQuerySchema, payload ?? {});
    return this.queries.execute(new ListPositionsQuery(book));
  }
}
