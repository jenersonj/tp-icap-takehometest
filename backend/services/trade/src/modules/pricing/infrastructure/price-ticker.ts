import { SYMBOL_REFERENCE_PRICES } from '@blotter/contracts';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { SERVICE_CONFIG, type ServiceConfig } from '../../../config/service.config.js';
import { CLOCK, type Clock } from '../../../shared/domain/clock.js';
import { TickPricesCommand } from '../application/commands/tick-prices.command.js';
import { basePrices } from '../domain/market-price.js';
import { PRICE_REPOSITORY, type PriceRepository } from '../domain/price.repository.js';

/**
 * The mock market feed. On start it seeds the reference prices for any symbol without
 * one, then sends TickPricesCommand every PRICE_TICK_MS. A tick that is still running when
 * the next is due is skipped rather than queued.
 */
@Injectable()
export class PriceTicker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PriceTicker.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(
    private readonly commands: CommandBus,
    @Inject(PRICE_REPOSITORY) private readonly prices: PriceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SERVICE_CONFIG) private readonly config: Pick<ServiceConfig, 'PRICE_TICK_MS'>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seeded = await this.prices.insertMissing(
      basePrices(SYMBOL_REFERENCE_PRICES, this.clock.now()),
    );
    if (seeded > 0) this.logger.log(`Seeded ${seeded} reference prices`);
    if (this.config.PRICE_TICK_MS > 0) {
      this.timer = setInterval(() => void this.tick(), this.config.PRICE_TICK_MS);
      this.timer.unref();
      this.logger.log(`Mock price ticker running every ${this.config.PRICE_TICK_MS} ms`);
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.commands.execute(new TickPricesCommand());
    } catch (error) {
      this.logger.warn(`Price tick failed: ${String(error)}`);
    } finally {
      this.ticking = false;
    }
  }
}
