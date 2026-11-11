import type { Actor, CreateTradeInput, TradeRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { Trade } from '../../domain/trade.js';
import { TRADE_REPOSITORY, type TradeRepository } from '../../domain/trade.repository.js';
import { TradeCommandRunner } from '../trade-command-runner.js';
import { toTradeRecord } from '../trade-record.mapper.js';

export class CreateTradeCommand {
  constructor(
    readonly actor: Actor,
    readonly input: CreateTradeInput,
  ) {}
}

@CommandHandler(CreateTradeCommand)
export class CreateTradeHandler implements ICommandHandler<CreateTradeCommand, TradeRecord> {
  constructor(
    @Inject(TRADE_REPOSITORY) private readonly trades: TradeRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly runner: TradeCommandRunner,
  ) {}

  async execute({ actor, input }: CreateTradeCommand): Promise<TradeRecord> {
    const { tradeTimestamp, ...fields } = input;
    const trade = Trade.create(
      this.trades.newId(),
      await this.trades.nextTradeRef(),
      { ...fields, ...(tradeTimestamp ? { tradeTimestamp: new Date(tradeTimestamp) } : {}) },
      actor,
      this.clock.now(),
    );
    await this.runner.commit(trade, () => this.trades.insert(trade));
    return toTradeRecord(trade);
  }
}
