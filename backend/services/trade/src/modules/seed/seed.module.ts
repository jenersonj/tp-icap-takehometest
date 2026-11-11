import { Module } from '@nestjs/common';

import { TradeSeeder } from './trade-seeder.js';

@Module({ providers: [TradeSeeder], exports: [TradeSeeder] })
export class SeedModule {}
