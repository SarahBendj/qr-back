import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { assertUserHasPaidPlan } from '../common/plan-access';

/** Price in cents — overview for plans strictly above $20 */
const OVERVIEW_MIN_PRICE_CENTS = 2001;

const OVERVIEW_PRO_TIERS: PlanTier[] = [PlanTier.BUSINESS];

export type EventOverviewRow = {
  id: string;
  title: string;
  category: string;
  slug: string;
  date: string | null;
  views: number;
  registered: number;
  confirmed: number;
  pending: number;
  declined: number;
  responseRate: number;
  avgResponseHours: number | null;
  interestScore: number;
};

@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  private planGrantsOverview(tier: PlanTier, priceCents: number): boolean {
    if (OVERVIEW_PRO_TIERS.includes(tier)) return true;
    return priceCents >= OVERVIEW_MIN_PRICE_CENTS;
  }

  private async assertOverviewAccess(userId: string) {
    await assertUserHasPaidPlan(this.stripeService, userId, 'OVERVIEW_PRO_ONLY');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.plan) {
      throw new ForbiddenException('OVERVIEW_PRO_ONLY');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { tier: user.plan },
      select: { price: true, tier: true },
    });
    if (!plan || !this.planGrantsOverview(plan.tier, plan.price)) {
      throw new ForbiddenException('OVERVIEW_PRO_ONLY');
    }
  }

  async recordEventView(
    category: string,
    slug: string,
    source?: string,
    viewerUserId?: string | null,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { category, slug },
      select: {
        id: true,
        userId: true,
        contact: true,
        user: { select: { email: true } },
      },
    });
    if (!event) return { recorded: false };

    if (viewerUserId) {
      if (event.userId === viewerUserId) {
        return { recorded: false, skipped: 'organizer' as const };
      }
      const viewer = await this.prisma.user.findUnique({
        where: { id: viewerUserId },
        select: { email: true },
      });
      const viewerEmail = viewer?.email?.trim().toLowerCase();
      if (viewerEmail) {
        const ownerEmail = event.user?.email?.trim().toLowerCase();
        const contactEmail = event.contact?.trim().toLowerCase();
        if (
          (ownerEmail && viewerEmail === ownerEmail) ||
          (contactEmail && viewerEmail === contactEmail)
        ) {
          return { recorded: false, skipped: 'organizer' as const };
        }
      }
    }

    await this.prisma.eventView.create({
      data: {
        eventId: event.id,
        source: source?.slice(0, 32) ?? 'direct',
      },
    });

    return { recorded: true };
  }

  async getDashboard(userId: string) {
    await this.assertOverviewAccess(userId);

    const events = await this.prisma.event.findMany({
      where: { userId },
      include: {
        participants: true,
        views: { select: { viewedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: EventOverviewRow[] = events.map((event) => {
      const guests = event.participants.filter((p) => p.role !== 'Organizer');
      const confirmed = guests.filter((p) => p.confirmed).length;
      const declined = guests.filter((p) => p.declined).length;
      const pending = guests.filter((p) => !p.confirmed && !p.declined).length;
      const registered = guests.length;
      const views = event.views.length;

      const responseTimes = guests
        .filter((p) => p.confirmed && p.respondedAt)
        .map((p) => {
          const responded = new Date(p.respondedAt!).getTime();
          const created = new Date(p.invitedAt).getTime();
          return (responded - created) / (1000 * 60 * 60);
        })
        .filter((h) => h >= 0);

      const avgResponseHours =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null;

      const responseRate =
        registered > 0 ? Math.round((confirmed / registered) * 100) : 0;

      const interestScore = views * 2 + confirmed * 5 - declined * 3;

      return {
        id: event.id,
        title: event.title,
        category: event.category ?? 'event',
        slug: event.slug,
        date: event.date?.toISOString() ?? null,
        views,
        registered,
        confirmed,
        pending,
        declined,
        responseRate,
        avgResponseHours:
          avgResponseHours != null
            ? Math.round(avgResponseHours * 10) / 10
            : null,
        interestScore,
      };
    });

    const summary = {
      eventCount: rows.length,
      views: rows.reduce((s, r) => s + r.views, 0),
      registered: rows.reduce((s, r) => s + r.registered, 0),
      confirmed: rows.reduce((s, r) => s + r.confirmed, 0),
      pending: rows.reduce((s, r) => s + r.pending, 0),
      declined: rows.reduce((s, r) => s + r.declined, 0),
      overallResponseRate: 0,
    };
    summary.overallResponseRate =
      summary.registered > 0
        ? Math.round((summary.confirmed / summary.registered) * 100)
        : 0;

    const categoryMap = new Map<
      string,
      { events: number; views: number; confirmed: number }
    >();
    for (const row of rows) {
      const cat = row.category || 'event';
      const prev = categoryMap.get(cat) ?? {
        events: 0,
        views: 0,
        confirmed: 0,
      };
      categoryMap.set(cat, {
        events: prev.events + 1,
        views: prev.views + row.views,
        confirmed: prev.confirmed + row.confirmed,
      });
    }

    const categories = [...categoryMap.entries()].map(([category, stats]) => ({
      category,
      ...stats,
    }));

    const sortedByViews = [...rows].sort((a, b) => b.views - a.views);
    const sortedByInterest = [...rows].sort(
      (a, b) => b.interestScore - a.interestScore,
    );
    const withResponse = rows.filter((r) => r.avgResponseHours != null);
    const sortedByResponse = [...withResponse].sort(
      (a, b) => (a.avgResponseHours ?? 999) - (b.avgResponseHours ?? 999),
    );
    const sortedByDeclined = [...rows].sort((a, b) => b.declined - a.declined);
    const sortedByIgnored = [...rows].sort((a, b) => b.pending - a.pending);

    const totalViews = summary.views || 1;
    const comparison = sortedByViews.map((row, index) => ({
      ...row,
      rank: index + 1,
      viewsShare: Math.round((row.views / totalViews) * 100),
    }));

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    return {
      plan: user?.plan ?? 'LITE',
      summary,
      categories,
      events: rows,
      highlights: {
        mostViewed: sortedByViews[0] ?? null,
        topInterest: sortedByInterest[0] ?? null,
        fastestResponse: sortedByResponse[0] ?? null,
        mostDeclined: sortedByDeclined[0] ?? null,
        mostIgnored: sortedByIgnored[0] ?? null,
      },
      comparison,
    };
  }
}
