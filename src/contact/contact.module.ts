import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { SmartQRUserMailing } from 'lib/mail/send.mail';

@Module({
  controllers: [ContactController],
  providers: [ContactService, SmartQRUserMailing],
})
export class ContactModule {}
