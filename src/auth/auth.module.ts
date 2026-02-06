import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SmartQRUserMailing } from 'lib/mail/send.mail';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.NEST_JWT_SECRET || process.env.NEXTAUTH_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, SmartQRUserMailing],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
