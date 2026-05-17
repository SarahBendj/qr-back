import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfQrModule } from './pdf-qr/pdf-qr.module';
import { EventModule } from './event/event.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilModule } from './profil/profil.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { StripeModule } from './stripe/stripe.module';
import { R2Module } from './r2/r2.module';
import { WalletModule } from './wallet/wallet.module';
import { ContactModule } from './contact/contact.module';
import { OverviewModule } from './overview/overview.module';
import { SalonModule } from './salon/salon.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PdfQrModule,
    EventModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    ProfilModule,
    WalletModule,
    ThrottlerModule.forRoot([
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    StripeModule,
    R2Module,
    ContactModule,
    OverviewModule,
    SalonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
