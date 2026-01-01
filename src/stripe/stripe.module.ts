import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports :  [ConfigModule , PrismaModule],
  providers: [StripeService],
  controllers : [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
