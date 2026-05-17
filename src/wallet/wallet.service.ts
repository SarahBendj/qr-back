// wallet.service.ts – complete, both platforms
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PKPass } from 'passkit-generator';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { SmartQRUserMailing } from 'lib/mail/send.mail';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: SmartQRUserMailing,
  ) {}

  // ── Shared ────────────────────────────────────────────────────────────────
  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        smartQrs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const displayName = user.name ?? user.email;
    const displayRole = user.role !== 'user' ? user.role : 'Membre SmartQR';

    const baseUrl = process.env.FRONTEND_URL ?? 'https://smart-qr.pro';
    const smartQr = user.smartQrs[0];
    const profileUrl = smartQr?.qrText?.startsWith('http')
      ? smartQr.qrText
      : smartQr?.slug
        ? `${baseUrl}/smart-profile/${smartQr.slug}`
        : baseUrl;

    return { user, displayName, displayRole, baseUrl, profileUrl };
  }

  // ── Apple Wallet ──────────────────────────────────────────────────────────
  async generateApplePass(userId: string): Promise<Buffer> {
    const { displayName, displayRole, profileUrl } = await this.getUser(userId);

    const pass = await PKPass.from({
      model: path.join(process.cwd(), 'pass-model'),
      certificates: {
        wwdr: fs.readFileSync('certificates/wwdr.pem'),
        signerCert: fs.readFileSync('certificates/signerCert.pem'),
        signerKey: fs.readFileSync('certificates/signerKey.pem'),
        signerKeyPassphrase: process.env.APPLE_CERT_PASSPHRASE,
      },
    });

    pass.primaryFields.push({ key: 'name', label: 'Nom', value: displayName });
    pass.secondaryFields.push({ key: 'role', label: 'Poste', value: displayRole });
    pass.setBarcodes({
      message: profileUrl,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
    });

    return pass.getAsBuffer();
  }

  // ── Google Wallet ─────────────────────────────────────────────────────────
  async generateGooglePassUrl(
    userId: string,
    extraOrigins: string[] = [],
  ): Promise<string> {
    const { displayName, displayRole, baseUrl, profileUrl } =
      await this.getUser(userId);

    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const serviceEmail = process.env.GOOGLE_WALLET_SERVICE_EMAIL;
    const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(
      /\\n/g,
      '\n',
    );

    if (!issuerId || !serviceEmail || !privateKey) {
      throw new Error('Missing Google Wallet env vars');
    }

    const classId = `${issuerId}.smartQr`;
    const objectId = `${issuerId}.user_${userId}_${Date.now()}`;

    const origins = Array.from(
      new Set([baseUrl, ...extraOrigins].filter(Boolean)),
    );

    this.logger.log(
      `Google Wallet save URL: classId=${classId} objectId=${objectId} origins=${origins.join(',')}`,
    );

    const payload = {
      iss: serviceEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins,
      payload: {
        genericClasses: [{ id: classId }],
        genericObjects: [
          {
            id: objectId,
            classId,
            hexBackgroundColor: '#0f172a',
            cardTitle: {
              defaultValue: { language: 'fr-FR', value: 'SmartQR' },
            },
            subheader: {
              defaultValue: { language: 'fr-FR', value: displayRole },
            },
            header: {
              defaultValue: { language: 'fr-FR', value: displayName },
            },
            barcode: { type: 'QR_CODE', value: profileUrl },
            linksModuleData: {
              uris: [
                {
                  uri: profileUrl,
                  description: 'Voir mon profil',
                  id: 'profile',
                },
              ],
            },
            state: 'ACTIVE',
          },
        ],
      },
    };

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  async sendWalletActivationEmail(
    userId: string,
    apiBaseUrl: string,
  ): Promise<void> {
    const { user, displayName, profileUrl } = await this.getUser(userId);

    const applePassUrl = `${apiBaseUrl}/wallet/apple/${userId}`;
    let googleSaveUrl = '';
    try {
      googleSaveUrl = await this.generateGooglePassUrl(userId, [apiBaseUrl]);
    } catch {
      googleSaveUrl = `${apiBaseUrl}/wallet/google/${userId}`;
    }

    await this.mailService.sendWalletActivationEmail(
      user.email,
      displayName,
      applePassUrl,
      googleSaveUrl,
      profileUrl,
    );
  }
}
