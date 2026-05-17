import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { R2Module } from '../r2/r2.module';
import { SalonLifecycleService } from './salon-lifecycle.service';

@Module({
  imports: [PrismaModule, R2Module],
  providers: [SalonLifecycleService],
  exports: [SalonLifecycleService],
})
export class SalonLifecycleModule {}
