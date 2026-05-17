import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { planGrantsCustomSalon } from './salon-entitlement';

/**
 * Salon create/update/delete without Stripe — avoids circular imports with StripeModule.
 */
@Injectable()
export class SalonLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async deleteSalonIfPlanRevoked(
    userId: string,
    tier: Parameters<typeof planGrantsCustomSalon>[0],
    priceCents?: number | null,
  ): Promise<boolean> {
    if (planGrantsCustomSalon(tier, priceCents ?? null)) {
      return false;
    }
    return this.deleteSalonForUser(userId);
  }

  async deleteSalonForUser(userId: string): Promise<boolean> {
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
    });
    if (!salon) return false;

    const keys = new Set<string>();
    if (salon.logoKey) keys.add(salon.logoKey);
    if (salon.faviconKey) keys.add(salon.faviconKey);
    for (const key of salon.bannerKeys) {
      if (key) keys.add(key);
    }

    for (const key of keys) {
      try {
        await this.r2.deleteFile(key);
      } catch {
        // best-effort storage cleanup
      }
    }

    await this.prisma.salonProfile.delete({ where: { userId } });

    const salonSlug = `salon-${salon.mark}`;
    await this.prisma.smartQR.deleteMany({
      where: { userId, slug: salonSlug },
    });

    return true;
  }
}
