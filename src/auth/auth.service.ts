import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { StripeService } from 'src/stripe/stripe.service';
import { CookieOptions } from 'express';

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_BASE: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
};

const ACCESS_TOKEN_MS = 1000 * 60 * 15; // 15 minutes — matches JWT expiresIn

const ACCESS_COOKIE_OPTS: CookieOptions = {
  ...COOKIE_BASE,
  maxAge: ACCESS_TOKEN_MS,
};

const REFRESH_COOKIE_OPTS: CookieOptions = {
  ...COOKIE_BASE,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private readonly mailService: SmartQRUserMailing,
    private readonly stripeService: StripeService,
  ) {}

  async handleGoogleLogin(
    payload: {
      id: string;
      email: string;
      name?: string;
      picture?: string;
      userConsented?: boolean;
    },
    res: Response,
  ) {
    const { id: googleId, email, name, picture, userConsented } = payload;

    if (!email) throw new UnauthorizedException('Google email missing');
    if (!userConsented) {
      return { ok: false, message: 'User did not consent to cookies' };
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { googleId, email, name, picture, plan: null },
      });
      await this.mailService.sendWelcomeToClient(email, name || 'customer');
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    res.cookie('nest_token', accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);

    await this.stripeService.ensureDefaultFreePlan(user.id);

    const freshUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    const { planPaid, planActive } =
      await this.stripeService.getPlanStatus(user.id);

    return {
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        plan: freshUser?.plan ?? null,
        planPaid,
        planActive,
      },
    };
  }

  private generateAccessToken(user: { id: string; email: string; role: string }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );
  }

  private async generateRefreshToken(userId: string) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

  async refreshToken(oldRefreshToken: string, res: Response) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        await this.prisma.refreshToken.delete({ where: { token: oldRefreshToken } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newRefreshToken = await this.generateRefreshToken(record.userId);
    await this.prisma.refreshToken.delete({ where: { token: oldRefreshToken } });

    // prune other expired tokens for this user (lightweight cleanup)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: record.userId, expiresAt: { lt: new Date() } },
    });

    const accessToken = this.generateAccessToken(record.user);

    res.cookie('nest_token', accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTS);

    return { accessToken };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    res.clearCookie('nest_token', COOKIE_BASE);
    res.clearCookie('refresh_token', COOKIE_BASE);
    return { ok: true, message: 'Logged out' };
  }
}
