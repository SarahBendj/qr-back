import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CandidateModule } from './candidate/candidate.module';
import { PdfQrModule } from './pdf-qr/pdf-qr.module';
import { EventModule } from './event/event.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilModule } from './profil/profil.module';
import { ThemeModule } from './theme/theme.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { StripeModule } from './stripe/stripe.module';
import { R2Module } from './r2/r2.module';
import { CompanyModule } from './company/company.module';
import { IdeaModule } from './idea/idea.module';

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
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    StripeModule,
    R2Module,
    CompanyModule,
    IdeaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
