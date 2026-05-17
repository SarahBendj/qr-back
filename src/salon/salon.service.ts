import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { planGrantsCustomSalon } from './salon-entitlement';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { StripeService } from '../stripe/stripe.service';
import { assertUserHasPaidPlan } from '../common/plan-access';
import { Express } from 'express';

const MAX_BANNERS = 10;
const RESERVED_MARKS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'cdn',
  'static',
  'lsmartqr',
  'smartqr',
]);

@Injectable()
export class SalonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly stripeService: StripeService,
  ) {}

  private async assertSalonEntitlement(userId: string) {
    await assertUserHasPaidPlan(this.stripeService, userId, 'SALON_PLAN_REQUIRED');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!user.plan) {
      throw new ForbiddenException('SALON_PLAN_REQUIRED');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { tier: user.plan },
      select: { price: true, tier: true },
    });

    if (!plan || !planGrantsCustomSalon(plan.tier, plan.price)) {
      throw new ForbiddenException('SALON_PLAN_REQUIRED');
    }
  }

  private normalizeMark(mark: string): string {
    return mark.trim().toLowerCase();
  }

  private validateMark(mark: string) {
    const m = this.normalizeMark(mark);
    if (m.length < 3 || m.length > 63) {
      throw new BadRequestException('Invalid mark length');
    }
    if (RESERVED_MARKS.has(m)) {
      throw new BadRequestException('Mark is reserved');
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(m)) {
      throw new BadRequestException('Invalid mark format');
    }
    return m;
  }

  private sanitizeOptionalText(
    value?: string | null,
    max = 200,
  ): string | null {
    const v = value?.trim();
    if (!v) return null;
    return v.slice(0, max);
  }

  private sanitizeContactEmails(emails?: string[] | null): string[] {
    if (!emails?.length) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of emails) {
      const e = raw?.trim().toLowerCase();
      if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
      if (seen.has(e)) continue;
      seen.add(e);
      out.push(e);
      if (out.length >= 3) break;
    }
    return out;
  }

  private sanitizeWebsite(url?: string | null): string | null {
    const v = url?.trim();
    if (!v) return null;
    const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const parsed = new URL(withProto);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('invalid protocol');
      }
      return withProto.slice(0, 200);
    } catch {
      throw new BadRequestException('Invalid website URL');
    }
  }

  private mapPublic(salon: {
    mark: string;
    displayName: string | null;
    tagline: string | null;
    aboutText: string | null;
    logoKey: string | null;
    faviconKey: string | null;
    bannerKeys: string[];
    accentColor: string | null;
    accentColor2: string | null;
    pageTheme: string;
    referenceName: string | null;
    contactEmails: string[];
    footerAddress: string | null;
    footerPhone: string | null;
    footerWebsite: string | null;
    footerLegal: string | null;
    user: {
      email: string;
      events: Array<{
        id: string;
        title: string;
        slug: string;
        category: string | null;
        date: Date | null;
        eventImage: string | null;
        location: string | null;
        isPrivate: boolean;
      }>;
    };
  }) {
    const contactEmails =
      salon.contactEmails.length > 0
        ? salon.contactEmails.slice(0, 3)
        : salon.user.email
          ? [salon.user.email]
          : [];

    const events = salon.user.events
      .filter((e) => !e.isPrivate)
      .map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        category: e.category ?? 'event',
        date: e.date?.toISOString() ?? null,
        eventImage: e.eventImage,
        location: e.location,
        href: `/event/${e.category ?? 'event'}/${e.slug}`,
      }));

    return {
      mark: salon.mark,
      displayName: salon.displayName,
      tagline: salon.tagline,
      aboutText: salon.aboutText,
      logoKey: salon.logoKey,
      faviconKey: salon.faviconKey,
      bannerKeys: salon.bannerKeys.slice(0, MAX_BANNERS),
      accentColor: salon.accentColor ?? '#a855f7',
      accentColor2: salon.accentColor2 ?? '#ec4899',
      pageTheme: salon.pageTheme === 'light' ? 'light' : 'dark',
      referenceName: salon.referenceName,
      contactEmails,
      footerAddress: salon.footerAddress,
      footerPhone: salon.footerPhone,
      footerWebsite: salon.footerWebsite,
      footerLegal: salon.footerLegal,
      events,
      whiteLabel: true,
    };
  }

  async getMine(userId: string) {
    await this.assertSalonEntitlement(userId);

    const existing = await this.prisma.salonProfile.findUnique({
      where: { userId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    return {
      salon: existing,
      entitled: true,
      suggestedMark: this.suggestMark(user?.name ?? user?.email ?? userId),
    };
  }

  private suggestMark(seed: string): string {
    const base = seed
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return base.length >= 3 ? base : `organizer-${Date.now().toString(36).slice(-4)}`;
  }

  async upsert(userId: string, dto: UpdateSalonDto) {
    await this.assertSalonEntitlement(userId);

    const existing = await this.prisma.salonProfile.findUnique({
      where: { userId },
    });

    let mark = existing?.mark;
    if (dto.mark != null) {
      mark = this.validateMark(dto.mark);
      const taken = await this.prisma.salonProfile.findFirst({
        where: { mark, NOT: { userId } },
      });
      if (taken) {
        throw new BadRequestException('Mark already taken');
      }
    }

    if (!mark && !existing) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      mark = this.validateMark(
        this.suggestMark(user?.name ?? user?.email ?? userId),
      );
    }

    if (!mark) {
      throw new BadRequestException('mark is required');
    }

    const bannerKeys =
      dto.bannerKeys != null
        ? dto.bannerKeys.slice(0, MAX_BANNERS)
        : (existing?.bannerKeys ?? []);

    const data = {
      mark,
      displayName: dto.displayName ?? existing?.displayName ?? null,
      tagline: dto.tagline ?? existing?.tagline ?? null,
      aboutText: dto.aboutText ?? existing?.aboutText ?? null,
      accentColor: dto.accentColor ?? existing?.accentColor ?? '#a855f7',
      accentColor2: dto.accentColor2 ?? existing?.accentColor2 ?? '#ec4899',
      pageTheme:
        dto.pageTheme === 'light' || dto.pageTheme === 'dark'
          ? dto.pageTheme
          : (existing?.pageTheme ?? 'dark'),
      referenceName:
        dto.referenceName !== undefined
          ? this.sanitizeOptionalText(dto.referenceName, 80)
          : (existing?.referenceName ?? null),
      contactEmails:
        dto.contactEmails !== undefined
          ? this.sanitizeContactEmails(dto.contactEmails)
          : (existing?.contactEmails ?? []),
      footerAddress:
        dto.footerAddress !== undefined
          ? this.sanitizeOptionalText(dto.footerAddress, 240)
          : (existing?.footerAddress ?? null),
      footerPhone:
        dto.footerPhone !== undefined
          ? this.sanitizeOptionalText(dto.footerPhone, 40)
          : (existing?.footerPhone ?? null),
      footerWebsite:
        dto.footerWebsite !== undefined
          ? this.sanitizeWebsite(dto.footerWebsite)
          : (existing?.footerWebsite ?? null),
      footerLegal:
        dto.footerLegal !== undefined
          ? this.sanitizeOptionalText(dto.footerLegal, 500)
          : (existing?.footerLegal ?? null),
      bannerKeys,
    };

    const salon = existing
      ? await this.prisma.salonProfile.update({
          where: { userId },
          data,
        })
      : await this.prisma.salonProfile.create({
          data: { userId, ...data },
        });

    await this.ensurePermanentSalonQr(userId, mark);

    return salon;
  }

  private async ensurePermanentSalonQr(userId: string, mark: string) {
    const salonUrl = this.getSalonPublicUrl(mark);

    const existing = await this.prisma.smartQR.findFirst({
      where: { userId },
    });

    if (existing) {
      await this.prisma.smartQR.update({
        where: { id: existing.id },
        data: { qrText: salonUrl },
      });
      return;
    }

    const slug = `salon-${mark}`;
    await this.prisma.smartQR.create({
      data: {
        userId,
        slug,
        qrText: salonUrl,
        x: 0,
        y: 0,
        size: 120,
      },
    });
  }

  async uploadLogo(userId: string, file: Express.Multer.File) {
    await this.assertSalonEntitlement(userId);
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
    });
    if (!salon) {
      throw new BadRequestException('Create salon profile first');
    }

    const key = await this.r2.uploadFile(file, 'salon');

    return this.prisma.salonProfile.update({
      where: { userId },
      data: { logoKey: key, faviconKey: key },
    });
  }

  async addBanner(userId: string, file: Express.Multer.File) {
    await this.assertSalonEntitlement(userId);
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
    });
    if (!salon) {
      throw new BadRequestException('Create salon profile first');
    }
    if (salon.bannerKeys.length >= MAX_BANNERS) {
      throw new BadRequestException(`Maximum ${MAX_BANNERS} banners`);
    }

    const key = await this.r2.uploadFile(file, 'salon');
    return this.prisma.salonProfile.update({
      where: { userId },
      data: { bannerKeys: [...salon.bannerKeys, key] },
    });
  }

  async removeBanner(userId: string, index: number) {
    await this.assertSalonEntitlement(userId);
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
    });
    if (!salon) throw new NotFoundException('Salon not found');

    if (index < 0 || index >= salon.bannerKeys.length) {
      throw new BadRequestException('Invalid banner index');
    }

    const key = salon.bannerKeys[index];
    const bannerKeys = salon.bannerKeys.filter((_, i) => i !== index);

    try {
      await this.r2.deleteFile(key);
    } catch {
      // ignore
    }

    return this.prisma.salonProfile.update({
      where: { userId },
      data: { bannerKeys },
    });
  }

  async getPublicByMark(mark: string) {
    const m = this.normalizeMark(mark);
    const salon = await this.prisma.salonProfile.findUnique({
      where: { mark: m },
      include: {
        user: {
          select: {
            email: true,
            events: {
              where: { isPrivate: false },
              orderBy: { date: 'asc' },
              select: {
                id: true,
                title: true,
                slug: true,
                category: true,
                date: true,
                eventImage: true,
                location: true,
                isPrivate: true,
              },
            },
          },
        },
      },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return this.mapPublic(salon);
  }

  getSalonPublicUrl(mark: string): string {
    const m = mark.trim().toLowerCase();
    const frontend = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');

    if (frontend && /localhost|127\.0\.0\.1/i.test(frontend)) {
      return `${frontend}/salon/${encodeURIComponent(m)}`;
    }

    if (process.env.NODE_ENV === 'development' && !process.env.SALON_PUBLIC_HOST) {
      const port = process.env.FRONTEND_PORT ?? '3001';
      return `http://localhost:${port}/salon/${encodeURIComponent(m)}`;
    }

    const baseHost = process.env.SALON_PUBLIC_HOST ?? 'smartqr.pro';
    const protocol = process.env.SALON_PUBLIC_PROTOCOL ?? 'https';
    return `${protocol}://${m}.${baseHost}`;
  }
}
