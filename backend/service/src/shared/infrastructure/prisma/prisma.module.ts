import { Global, Module } from '@nestjs/common';

import { UNIT_OF_WORK } from '../../application/unit-of-work.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService, { provide: UNIT_OF_WORK, useExisting: PrismaService }],
  exports: [PrismaService, UNIT_OF_WORK],
})
export class PrismaModule {}
