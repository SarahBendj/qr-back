import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SmartQRUserMailing } from 'lib/mail/send.mail';

@Injectable()
export class AuthService {
  
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
      private readonly mailService: SmartQRUserMailing
  ) {}


  // --- Google login + token creation ---
  async handleGoogleLogin(
    payload: {
      id: string;
      email: string;
      name?: string;
      picture?: string;
      userConsented?: boolean;
    },
    res: Response
  ) {
    const { id: googleId, email, name, picture, userConsented } = payload;

    if (!email) throw new UnauthorizedException('Google email missing');
    if (!userConsented) {
      return { ok: false, message: 'User did not consent to cookies' };
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { googleId, email, name, picture },
      });

    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
      await this.mailService.sendWelcomeToClient(email ,name || 'customer')
    }


    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

  const isProd = true; // ou process.env.NODE_ENV === 'production'

res.cookie('nest_token', accessToken, {
  httpOnly: true,            // ✅ JS client ne peut pas lire le token
  secure: false,              // ✅ HTTPS requis pour sameSite='none'
  sameSite: 'lax',          // ✅ obligatoire pour cross-site
  maxAge: 1000 * 60 * 60,    // 1h
  path: '/',                 // accessible partout
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 30,
  path: '/',
});

    return {
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
    };
  }

  // --- Generate access token ---
  private generateAccessToken(user: any) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    }, { expiresIn: '1h' });
  }

  // --- Generate refresh token and store in DB ---
  private async generateRefreshToken(userId: string) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 jours

    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

  // --- Refresh access token endpoint ---
  async refreshToken(oldRefreshToken: string, res: Response) {
    console.log('here')
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });
console.log(record)
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Optionally: rotate refresh token
    const newRefreshToken = await this.generateRefreshToken(record.userId);
    await this.prisma.refreshToken.delete({ where: { token: oldRefreshToken } });

    const accessToken = this.generateAccessToken(record.user);
    console.log(accessToken)

    // Set new cookies
    res.cookie('nest_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60,
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return { accessToken };
  }

  // --- Logout ---
  logoutResponse(res: Response) {
    res.clearCookie('nest_token', { httpOnly: true, secure: true, sameSite: 'none' });
    res.clearCookie('refresh_token', { httpOnly: true, secure: true, sameSite: 'none' });
    return { ok: true, message: 'Logged out' };
  }
}
