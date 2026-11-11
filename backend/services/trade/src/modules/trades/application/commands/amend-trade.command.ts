import type { Actor, TradeChanges, TradeRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { TRADE_REPOSITORY, type TradeRepository } from '../../domain/trade.repository.js';
import { TradeCommandRunner } from '../trade-command-runner.js';
import { toTradeRecord } from '../trade-record.mapper.js';

export class AmendTradeCommand {
  constructor(
    readonly actor: Actor,
    readonly id: string,
    readonly version: number,
    readonly changes: TradeChanges,
  ) {}
}

@CommandHandler(AmendTradeCommand)
export class AmendTradeHandler implements ICommandHandler<AmendTradeCommand, TradeRecord> {
  constructor(
    @Inject(TRADE_REPOSITORY) private readonly trades: TradeRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly runner: TradeCommandRunner,
  ) {}

  async execute({ actor, id, version, changes }: AmendTradeCommand): Promise<TradeRecord> {
    const trade = await this.trades.findById(id);
    if (!trade) throw DomainError.notFound('Trade', id);
    trade.amend(changes, version, actor, this.clock.now());
    await this.runner.commit(trade, () => this.trades.update(trade, version));
    return toTradeRecord(trade);
  }
}
