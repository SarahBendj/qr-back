import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentInvoiceService } from './payment-invoice.service';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { SalonLifecycleModule } from '../salon/salon-lifecycle.module';

@Module({
  imports: [ConfigModule, PrismaModule, SalonLifecycleModule],
  providers: [StripeService, PaymentInvoiceService, SmartQRUserMailing],
  controllers: [StripeController],
  exports: [StripeService, PaymentInvoiceService],
})
export class StripeModule {}
