import { Module } from '@nestjs/common';
import { SalonController } from './salon.controller';
import { SalonService } from './salon.service';
import { PrismaModule } from '../prisma/prisma.module';
import { R2Module } from '../r2/r2.module';
import { StripeModule } from '../stripe/stripe.module';
import { SalonLifecycleModule } from './salon-lifecycle.module';

@Module({
  imports: [PrismaModule, R2Module, StripeModule, SalonLifecycleModule],
  controllers: [SalonController],
  providers: [SalonService],
  exports: [SalonService],
})
export class SalonModule {}
