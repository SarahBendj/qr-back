// wallet.controller.ts
import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Safer endpoints: use authenticated user id
  @UseGuards(JwtAuthGuard)
  @Get('apple')
  async applePassForMe(@Req() req: { user: { id: string } }, @Res() res: Response) {
    const buffer = await this.walletService.generateApplePass(req.user.id);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="smartqr.pkpass"',
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('google')
  async googlePassForMe(@Req() req: { user: { id: string } }) {
    const url = await this.walletService.generateGooglePassUrl(req.user.id);
    const apiBaseUrl =
      process.env.HOST ||
      `${(req as any).headers?.['x-forwarded-proto'] ?? (req as any).protocol}://${(req as any).headers?.host}`;
    await this.walletService.sendWalletActivationEmail(req.user.id, apiBaseUrl);
    return { url };
  }

  @UseGuards(JwtAuthGuard)
  @Get('send-activation-email')
  async sendActivationEmail(@Req() req: any) {
    const apiBaseUrl =
      process.env.HOST ||
      `${req.headers['x-forwarded-proto'] ?? req.protocol}://${req.headers.host}`;
    await this.walletService.sendWalletActivationEmail(req.user.id, apiBaseUrl);
    return { ok: true };
  }

  // Debug / admin-style endpoints: explicit userId
  @Get('apple/:userId')
  async applePass(@Param('userId') userId: string, @Res() res: Response) {
    const buffer = await this.walletService.generateApplePass(userId);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="smartqr.pkpass"',
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  }

  @Get('google/:userId')
  async googlePass(@Param('userId') userId: string) {
    const url = await this.walletService.generateGooglePassUrl(userId);
    return { url };
  }
}