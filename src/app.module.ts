import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CandidateController } from './candidate/candidate.controller';
import { CandidateService } from './candidate/candidate.service';
import { CandidateModule } from './candidate/candidate.module';
import { PdfQrController } from './pdf-qr/pdf-qr.controller';
import { PdfQrService } from './pdf-qr/pdf-qr.service';
import { PdfQrModule } from './pdf-qr/pdf-qr.module';
import { EventController } from './event/event.controller';
import { EventModule } from './event/event.module';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilController } from './profil/profil.controller';
import { ProfilModule } from './profil/profil.module';
import { ThemeController } from './theme/theme.controller';
import { ThemeModule } from './theme/theme.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { StripeModule } from './stripe/stripe.module';
import { R2Controller } from './r2/r2.controller';
import { R2Module } from './r2/r2.module';

@Module({
  imports: [
    CandidateModule,
    PdfQrModule,
    EventModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    ProfilModule,
    ThemeModule,
    ThrottlerModule.forRoot([
      // { name: 'short', ttl: 1000, limit: 5 },   // 3 req/sec
      // { name: 'medium', ttl: 1000, limit: 20 }, // 20 req/10s
      { name: 'long', ttl: 6000, limit: 100 }, // 100 req/min
      //  { name: 'exp', ttl: 3600000 * 24, limit: 6 }, // 6 req/24h
    ]),
    StripeModule,
    R2Module,
  ],
  controllers: [AppController, CandidateController, PdfQrController, EventController, AuthController, ProfilController, ThemeController, R2Controller],
  providers: [AppService, CandidateService, PdfQrService  ,{ provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard }] ,
})
export class AppModule {}
