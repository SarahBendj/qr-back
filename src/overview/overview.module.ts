import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    JwtModule.register({
      secret: process.env.NEST_JWT_SECRET || process.env.NEXTAUTH_SECRET,
    }),
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {}
