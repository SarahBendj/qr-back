import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { R2Module } from 'src/r2/r2.module';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { ThrottlerModule } from '@nestjs/throttler';
import { InviteBulkListener } from './listeners/invite-bulk.listener';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  providers: [EventService, SmartQRUserMailing, InviteBulkListener, ThrottlerModule],
  imports: [R2Module, StripeModule],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
