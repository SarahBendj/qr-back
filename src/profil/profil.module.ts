import { Module } from '@nestjs/common';
import { ProfilService } from './profil.service';
import { ProfilController } from './profil.controller';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [PrismaModule, StripeModule],
  providers: [ProfilService, SmartQRUserMailing],
  controllers: [ProfilController],
  exports: [ProfilService],
})
export class ProfilModule {}
