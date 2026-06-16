import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentType, PlanTier } from '@prisma/client';
import { PaymentInvoiceService } from './payment-invoice.service';
import type { PaymentInvoiceResponse } from 'lib/invoice/payment-invoice.types';
import {
  assertCustomPlanAmount,
  isCustomPlanTier,
} from './custom-plan.util';
import { SalonLifecycleService } from '../salon/salon-lifecycle.service';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly paymentInvoiceService: PaymentInvoiceService,
    private readonly salonLifecycle: SalonLifecycleService,
  ) {
    const secretKey = this.configService.getOrThrow('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey);
  }

  getStripeInstance(): Stripe {
    return this.stripe;
  }

  private readonly planSelect = {
    id: true,
    tier: true,
    name: true,
    description: true,
    price: true,
    currency: true,
    interval: true,
    intervalCount: true,
    maxEvents: true,
    maxGuests: true,
    maxEmails: true,
    discount: true,
    features: true,
    stripePriceId: true,
  } as const;

  private readonly planSlugToTier: Record<string, PlanTier> = {
    lite: PlanTier.LITE,
    growth: PlanTier.GROWTH,
    business: PlanTier.BUSINESS,
    unique: PlanTier.LITE,
    starter: PlanTier.GROWTH,
    pro: PlanTier.BUSINESS,
  };

  /** Card + wallets (Klarna, Amazon Pay, Link, …) — enable them in Stripe Dashboard too */
  private checkoutPaymentSettings(): Stripe.Checkout.SessionCreateParams {
    const fromEnv = process.env.STRIPE_PAYMENT_METHODS?.split(',')
      .map((m) => m.trim())
      .filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[] | undefined;

    if (fromEnv?.length) {
      return { payment_method_types: fromEnv };
    }

    return {
      payment_method_types: [
        'card',
        'klarna',
        'amazon_pay',
        'link',
      ],
    };
  }

  private frontendBase(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.HOST ||
      'http://localhost:3001'
    );
  }

  private checkoutUrls() {
    const base = this.frontendBase();
    return {
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payment/cancel`,
    };
  }

  private async resolvePlan(planId: string) {
    const byId = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (byId) return byId;

    const tier = this.planSlugToTier[planId.toLowerCase()];
    if (tier) {
      const byTier = await this.prisma.plan.findUnique({ where: { tier } });
      if (byTier) return byTier;
    }

    throw new BadRequestException('Plan not found');
  }

  private async getOrCreateStripeCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (user.stripeCustomerId) {
      return { user, customerId: user.stripeCustomerId };
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return { user, customerId: customer.id };
  }

  /** Stripe Checkout needs `price_xxx` — not the amount in Plan.price */
  private async ensureStripePriceId(plan: {
    id: string;
    tier: PlanTier;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    interval: string;
    intervalCount: number;
    stripePriceId: string | null;
  }): Promise<string> {
    if (plan.price <= 0) {
      throw new BadRequestException('FREE_PLAN_NO_STRIPE_CHECKOUT');
    }

    if (plan.stripePriceId) return plan.stripePriceId;

    const envPriceIds: Record<PlanTier, string | undefined> = {
      LITE: process.env.STRIPE_PRICE_LITE,
      GROWTH: process.env.STRIPE_PRICE_GROWTH,
      BUSINESS: process.env.STRIPE_PRICE_BUSINESS,
    };
    const fromEnv = envPriceIds[plan.tier];
    if (fromEnv) {
      await this.prisma.plan.update({
        where: { id: plan.id },
        data: { stripePriceId: fromEnv },
      });
      return fromEnv;
    }

    const product = await this.stripe.products.create({
      name: plan.name,
      description: plan.description ?? undefined,
      metadata: { planId: plan.id, tier: plan.tier },
    });

    const interval =
      plan.interval === 'year' ? 'year' : ('month' as Stripe.Price.Recurring.Interval);

    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: plan.currency.toLowerCase(),
      recurring: {
        interval,
        interval_count: plan.intervalCount,
      },
    });

    await this.prisma.plan.update({
      where: { id: plan.id },
      data: { stripePriceId: price.id },
    });

    return price.id;
  }

  async listPlans() {
    const rows = await this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
      select: this.planSelect,
    });
    return rows.map((plan) => ({
      ...plan,
      maxEvents: plan.maxEvents ?? null,
      maxGuests: plan.maxGuests ?? null,
      maxEmails: plan.maxEmails ?? null,
    }));
  }

  private isCheckoutSessionPaid(session: Stripe.Checkout.Session): boolean {
    return (
      session.status === 'complete' &&
      (session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required')
    );
  }

  private parsePlanIdFromProductId(productId: string): string | null {
    return productId.match(/^plan_([^_]+)_/)?.[1] ?? null;
  }

  /** Latest checkout in progress — plan must not be granted until payment succeeds. */
  private async getPendingPlanCheckout(userId: string) {
    const pending = await this.prisma.payment.findFirst({
      where: {
        userId,
        status: 'pending',
        productId: { startsWith: 'plan_' },
      },
      orderBy: { createdAt: 'desc' },
      select: { productId: true, createdAt: true },
    });
    if (!pending) return null;

    const planId = this.parsePlanIdFromProductId(pending.productId);
    if (!planId) return null;

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        tier: true,
        name: true,
        price: true,
        currency: true,
      },
    });
    if (!plan) return null;

    return {
      planId: plan.id,
      tier: plan.tier,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      status: 'pending' as const,
      startedAt: pending.createdAt,
    };
  }

  /** Revert plan tier stored on user when checkout never completed. */
  private async reconcileUserPlanWithPayment(userId: string, planPaid: boolean) {
    if (planPaid) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (user?.plan) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { plan: null },
      });
    }
  }

  /** Statut abonnement pour le profil — sans catalogue ni détails Stripe */
  async getPlanStatus(userId: string): Promise<{
    planPaid: boolean;
    planActive: boolean;
  }> {
    const [hasActiveSubscription, succeededPlanPayment] = await Promise.all([
      this.checkPaidSubscriptionEntitlement(userId),
      this.prisma.payment.findFirst({
        where: {
          userId,
          status: 'succeeded',
          productId: { startsWith: 'plan_' },
        },
        select: { id: true },
      }),
    ]);

    const planPaid =
      hasActiveSubscription || Boolean(succeededPlanPayment);

    await this.reconcileUserPlanWithPayment(userId, planPaid);

    return {
      planPaid,
      planActive: hasActiveSubscription,
    };
  }

  async getPlanDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        stripeCustomerId: true,
        maxEventsOverride: true,
        maxGuestsOverride: true,
        maxEmailsOverride: true,
      },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const [plans, eventCount, hasActiveSubscription, succeededPlanPayment] =
      await Promise.all([
        this.listPlans(),
        this.prisma.event.count({ where: { userId } }),
        this.checkPaidSubscriptionEntitlement(userId),
        this.prisma.payment.findFirst({
          where: {
            userId,
            status: 'succeeded',
            OR: [
              { productId: { startsWith: 'plan_' } },
              { type: PaymentType.event },
            ],
          },
          select: { id: true },
        }),
      ]);

    const planPaid =
      hasActiveSubscription || Boolean(succeededPlanPayment);
    const planActive = hasActiveSubscription;
    const hasEventPlan = planPaid;

    await this.reconcileUserPlanWithPayment(userId, planPaid);

    const entitledTier = planPaid ? (user.plan ?? null) : null;
    const currentPlan = entitledTier
      ? (plans.find((p) => p.tier === entitledTier) ?? null)
      : null;
    const pendingPlanCheckout = planPaid
      ? null
      : await this.getPendingPlanCheckout(userId);

    return {
      currentTier: entitledTier,
      currentPlan,
      pendingPlanCheckout,
      plans,
      hasEventPlan,
      planPaid,
      planActive,
      usage: {
        events: eventCount,
        maxEvents:
          user.maxEventsOverride ?? currentPlan?.maxEvents ?? null,
        maxGuests:
          user.maxGuestsOverride ?? currentPlan?.maxGuests ?? null,
        maxEmails:
          user.maxEmailsOverride ?? currentPlan?.maxEmails ?? null,
      },
      billing: {
        hasActiveSubscription,
        planPaid,
        planActive,
        canManageBilling: Boolean(user.stripeCustomerId),
      },
    };
  }

  async createPaymentIntent(
    userId: string,
    planId: string,
    amount: number,
    currency: string,
    eventId?: string,
    maxEvents?: number,
    maxEmails?: number,
  ) {
    const plan = await this.resolvePlan(planId);
    const isCustom = isCustomPlanTier(plan.tier);

    if (isCustom) {
      if (maxEvents == null || maxEmails == null) {
        throw new BadRequestException('CUSTOM_PLAN_LIMITS_REQUIRED');
      }
      try {
        assertCustomPlanAmount(amount, maxEvents, maxEmails);
      } catch {
        throw new BadRequestException('CUSTOM_PLAN_PRICE_MISMATCH');
      }
    }

    const { customerId } = await this.getOrCreateStripeCustomer(userId);
    const type = PaymentType.event;
    const amountCents = Math.round(amount * 100);
    const currencyLower = currency.toLowerCase();

    const payment = await this.prisma.payment.create({
      data: {
        productId: eventId ? `event_${eventId}` : `plan_${planId}_${userId}`,
        amount: amountCents,
        currency: currencyLower,
        type,
        status: 'pending',
        user: { connect: { id: userId } },
      },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      ...this.checkoutPaymentSettings(),
      ...this.checkoutUrls(),
      locale: 'auto',
      billing_address_collection: 'required',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currencyLower,
            unit_amount: amountCents,
            product_data: { name: plan.name },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        planId,
        eventId: eventId ?? '',
        userId,
        ...(isCustom
          ? {
              maxEvents: String(maxEvents),
              maxEmails: String(maxEmails),
            }
          : {}),
      },
    });

    await this.prisma.paymentSession.create({
      data: {
        paymentId: payment.id,
        stripeSessionId: session.id,
        status: 'pending',
        type,
      },
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }
    return { url: session.url };
  }

  async createSubscription(userId: string, planId: string) {
    const plan = await this.resolvePlan(planId);

    if (plan.price === 0) {
      return this.activateFreePlan(userId, plan);
    }

    const stripePriceId = await this.ensureStripePriceId(plan);

    const { customerId } = await this.getOrCreateStripeCustomer(userId);
    const activeSubs = await this.listActiveSubscriptionsForCustomer(customerId);

    const alreadyOnThisPlan = activeSubs.some(
      (sub) => sub.items.data[0]?.price?.id === stripePriceId,
    );
    if (alreadyOnThisPlan) {
      throw new BadRequestException('PLAN_ALREADY_ACTIVE');
    }

    if (activeSubs.length > 0) {
      return this.changeSubscription(userId, planId);
    }

    const type = PaymentType.event;
    const productId = `plan_${plan.id}_${userId}`;

    let payment = await this.prisma.payment.findUnique({ where: { productId } });
    if (payment?.status === 'succeeded' && payment.stripeSubscriptionId) {
      const subStillActive = activeSubs.some(
        (s) => s.id === payment!.stripeSubscriptionId,
      );
      if (subStillActive) {
        throw new BadRequestException('PAYMENT_ALREADY_DONE');
      }
    }
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          productId,
          amount: plan.price,
          currency: plan.currency.toLowerCase(),
          type,
          status: 'pending',
          user: { connect: { id: userId } },
        },
      });
    }

    const checkout = await this.createSubscriptionCheckoutSession(
      userId,
      plan,
      customerId,
      payment.id,
    );
    return { url: checkout.url };
  }

  /** Activate a $0 catalog plan without Stripe checkout */
  private async activateFreePlan(
    userId: string,
    plan: {
      id: string;
      tier: PlanTier;
      price: number;
      currency: string;
    },
  ) {
    if (plan.price !== 0) {
      throw new BadRequestException('Plan is not free');
    }

    const productId = `plan_${plan.id}_${userId}`;
    let payment = await this.prisma.payment.findUnique({ where: { productId } });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          productId,
          amount: 0,
          currency: plan.currency.toLowerCase(),
          type: PaymentType.event,
          status: 'succeeded',
          user: { connect: { id: userId } },
        },
      });
    } else if (payment.status !== 'succeeded') {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'succeeded', amount: 0 },
      });
    }

    await this.applyPlanToUser(plan.id, userId);

    return {
      url: `${this.frontendBase()}/payment/success?free=1&plan=${plan.tier}`,
    };
  }

  async createCustomerPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe customer ID');
    }

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: process.env.FRONTEND_BILLING_RETURN_URL,
    });

    return { url: portalSession.url };
  }

  async handleWebhook(event: Stripe.Event) {
    const obj: any = event.data.object;
    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentId = paymentIntent.metadata?.paymentId;
        const eventId = paymentIntent.metadata?.eventId;
        const planId = paymentIntent.metadata?.planId;

        if (!paymentId) return;

        await this.prisma.paymentSession.updateMany({
          where: { stripeSessionId: paymentIntent.id },
          data: { used: true, status: 'complete' },
        });

        const record = await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'succeeded' },
        });

        void this.issueInvoiceAfterPayment(record.id);

        if (eventId) {
          await this.prisma.event.update({
            where: { id: eventId },
            data: { isPrivatePaid: true },
          });
        } else if (planId) {
          await this.applyPlanToUser(
            planId,
            record.userId,
            undefined,
            this.parseCustomLimits(paymentIntent.metadata),
          );
        }
      }

      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        const subscription = obj as Stripe.Subscription;
        const userId = subscription.metadata?.userId as string | undefined;
        const planId = subscription.metadata?.planId as string | undefined;

        if (
          subscription.status === 'active' ||
          subscription.status === 'trialing'
        ) {
          if (userId && planId) {
            await this.cancelOtherActiveSubscriptions(
              userId,
              subscription.id,
            );
            await this.applyPlanToUser(planId, userId, subscription.id);
            await this.syncPaymentSubscription(
              userId,
              planId,
              subscription.id,
            );
          }
        }

        const payment = await this.prisma.payment.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (
          subscription.cancel_at ||
          subscription.status === 'canceled' ||
          subscription.status === 'unpaid'
        ) {
          const ownerId = payment?.userId ?? userId;
          if (ownerId) {
            const stillActive = await this.checkActiveSubscription(ownerId);
            if (!stillActive) {
              await this.handleSubscriptionCancellation(ownerId);
            }
          }
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const subscription = obj as Stripe.Subscription;
        const payment = await this.prisma.payment.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        const ownerId =
          payment?.userId ?? (subscription.metadata?.userId as string);
        if (ownerId) {
          const stillActive = await this.checkActiveSubscription(ownerId);
          if (!stillActive) {
            await this.handleSubscriptionCancellation(ownerId);
          }
        }
        await this.prisma.payment.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'canceled', stripeSubscriptionId: null },
        });
      }

      if (event.type === 'checkout.session.completed') {
        const session = obj as Stripe.Checkout.Session;
        if (!session.metadata?.paymentId) return;

        const sessionRecord = await this.prisma.paymentSession.findUnique({
          where: { stripeSessionId: session.id },
        });
        if (!sessionRecord) return;

        const paid = this.isCheckoutSessionPaid(session);
        const eventId = session.metadata?.eventId;
        const planId = session.metadata?.planId;

        if (!paid) {
          await this.prisma.paymentSession.update({
            where: { id: sessionRecord.id },
            data: { status: 'pending' },
          });
          await this.prisma.payment.update({
            where: { id: sessionRecord.paymentId },
            data: { status: 'pending' },
          });
          return;
        }

        await this.prisma.paymentSession.update({
          where: { id: sessionRecord.id },
          data: { used: true, status: 'complete', paidAt: new Date() },
        });

        const record = await this.prisma.payment.update({
          where: { id: sessionRecord.paymentId },
          data: {
            status: 'succeeded',
            ...(session.subscription
              ? {
                  stripeSubscriptionId: session.subscription as string,
                }
              : {}),
          },
        });

        if (session.mode === 'payment') {
          if (eventId) {
            await this.prisma.event.update({
              where: { id: eventId },
              data: { isPrivatePaid: true },
            });
          } else if (planId) {
            await this.applyPlanToUser(
              planId,
              record.userId,
              undefined,
              this.parseCustomLimits(session.metadata ?? {}),
            );
          }
        }

        if (session.mode === 'subscription' && planId) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;
          if (subId) {
            await this.cancelOtherActiveSubscriptions(record.userId, subId);
          }
          await this.applyPlanToUser(planId, record.userId, subId);
        }

        void this.issueInvoiceAfterPayment(record.id);
      }

      if (event.type === 'invoice.payment_succeeded') {
        const invoice = obj as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details
          ?.subscription as string;
        if (!subscriptionId) return;

        const payment = await this.prisma.payment.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (!payment) return;

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'succeeded' },
        });

        const fromProduct = payment.productId.match(/^plan_([^_]+)_/);
        const planId =
          (invoice.lines?.data[0]?.metadata?.planId as string) ||
          fromProduct?.[1];

        if (planId) {
          await this.cancelOtherActiveSubscriptions(
            payment.userId,
            subscriptionId,
          );
          await this.applyPlanToUser(planId, payment.userId, subscriptionId);
        }

        void this.issueInvoiceAfterPayment(payment.id);
      }
    } catch (err) {
      console.error('Stripe webhook error:', err);
    }
  }

  private async issueInvoiceAfterPayment(paymentId: string): Promise<void> {
    try {
      await this.paymentInvoiceService.issueForPayment(paymentId, {
        sendEmail: true,
        includePdfBase64: false,
      });
    } catch (err) {
      console.error(`Invoice generation failed for ${paymentId}:`, err);
    }
  }

  private parseCustomLimits(
    metadata: Stripe.Metadata | Record<string, string | undefined> | null,
  ): { maxEvents: number; maxEmails: number } | null {
    if (!metadata) return null;
    const maxEvents = Number(metadata.maxEvents);
    const maxEmails = Number(metadata.maxEmails);
    if (!Number.isFinite(maxEvents) || !Number.isFinite(maxEmails)) {
      return null;
    }
    return { maxEvents, maxEmails };
  }

  private async applyPlanToUser(
    planId: string,
    userId?: string,
    keepSubscriptionId?: string,
    customLimits?: { maxEvents: number; maxEmails: number } | null,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !userId) return;

    await this.cancelOtherActiveSubscriptions(userId, keepSubscriptionId);

    const isCustom = isCustomPlanTier(plan.tier);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: plan.tier,
        maxEventsOverride:
          isCustom && customLimits ? customLimits.maxEvents : null,
        maxGuestsOverride: null,
        maxEmailsOverride:
          isCustom && customLimits ? customLimits.maxEmails : null,
      },
    });

    await this.salonLifecycle.deleteSalonIfPlanRevoked(
      userId,
      plan.tier,
      plan.price,
    );

    await this.pruneUserEventsToPlanLimit(userId, plan);
  }

  /** Remove oldest events when the user exceeds the new plan limit. */
  private async pruneUserEventsToPlanLimit(
    userId: string,
    plan: { maxEvents: number | null },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const maxEvents = user.maxEventsOverride ?? plan.maxEvents ?? 1;
    const count = await this.prisma.event.count({ where: { userId } });
    if (count <= maxEvents) return;

    const excess = count - maxEvents;
    const oldest = await this.prisma.event.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: excess,
      select: { id: true },
    });

    if (oldest.length === 0) return;

    await this.prisma.event.deleteMany({
      where: { id: { in: oldest.map((e) => e.id) } },
    });
  }

  /** Marque les anciens paiements plan comme annulés et lie le nouvel abonnement */
  private async syncPaymentSubscription(
    userId: string,
    planId: string,
    stripeSubscriptionId: string,
  ) {
    const productId = `plan_${planId}_${userId}`;
    await this.prisma.payment.updateMany({
      where: {
        userId,
        productId: { startsWith: 'plan_' },
        NOT: { productId },
      },
      data: { status: 'canceled', stripeSubscriptionId: null },
    });

    await this.prisma.payment.updateMany({
      where: { userId, productId },
      data: { status: 'succeeded', stripeSubscriptionId },
    });
  }

  /** Subscriptions that grant plan access (paid / trialing only — not past_due). */
  private async listPaidEntitledSubscriptionsForCustomer(
    customerId: string,
  ): Promise<Stripe.Subscription[]> {
    const statuses: Stripe.SubscriptionListParams.Status[] = [
      'active',
      'trialing',
    ];
    const results = await Promise.all(
      statuses.map((status) =>
        this.stripe.subscriptions.list({
          customer: customerId,
          status,
          limit: 100,
        }),
      ),
    );
    const byId = new Map<string, Stripe.Subscription>();
    for (const list of results) {
      for (const sub of list.data) {
        byId.set(sub.id, sub);
      }
    }
    return [...byId.values()];
  }

  private async listActiveSubscriptionsForCustomer(
    customerId: string,
  ): Promise<Stripe.Subscription[]> {
    const statuses: Stripe.SubscriptionListParams.Status[] = [
      'active',
      'trialing',
      'past_due',
    ];
    const results = await Promise.all(
      statuses.map((status) =>
        this.stripe.subscriptions.list({
          customer: customerId,
          status,
          limit: 100,
        }),
      ),
    );
    const byId = new Map<string, Stripe.Subscription>();
    for (const list of results) {
      for (const sub of list.data) {
        byId.set(sub.id, sub);
      }
    }
    return [...byId.values()];
  }

  /**
   * Un seul abonnement actif par client — résilie les autres chez Stripe.
   */
  private async cancelOtherActiveSubscriptions(
    userId: string,
    keepSubscriptionId?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return;

    const subs = await this.listActiveSubscriptionsForCustomer(
      user.stripeCustomerId,
    );

    for (const sub of subs) {
      if (keepSubscriptionId && sub.id === keepSubscriptionId) {
        continue;
      }
      try {
        await this.stripe.subscriptions.cancel(sub.id);
      } catch (err) {
        console.error(`Failed to cancel subscription ${sub.id}:`, err);
      }
      await this.prisma.payment.updateMany({
        where: { stripeSubscriptionId: sub.id, userId },
        data: { status: 'canceled', stripeSubscriptionId: null },
      });
    }
  }

  async checkSession(sessionId: string) {
    if (!sessionId) throw new BadRequestException('sessionId is required');

    const session = await this.prisma.paymentSession.findUnique({
      where: { token: sessionId },
    });

    if (session?.used) {
      return {
        used: true,
        message: 'This payment session has already been used',
      };
    }
    return { used: false, clientSecret: null };
  }

  /** After Stripe Checkout redirect — verify cs_… session id */
  async verifyCheckoutSession(checkoutSessionId: string, userId?: string) {
    if (!checkoutSessionId?.startsWith('cs_')) {
      throw new BadRequestException('Invalid checkout session id');
    }

    const stripeSession = await this.stripe.checkout.sessions.retrieve(
      checkoutSessionId,
    );

    const local = await this.prisma.paymentSession.findUnique({
      where: { stripeSessionId: checkoutSessionId },
      include: { payment: true },
    });

    if (userId && local?.payment?.userId && local.payment.userId !== userId) {
      throw new BadRequestException('Session does not belong to this user');
    }

    const paid =
      stripeSession.status === 'complete' &&
      (stripeSession.payment_status === 'paid' ||
        stripeSession.payment_status === 'no_payment_required');

    const status: 'succeeded' | 'pending' | 'failed' | 'cancelled' = paid
      ? 'succeeded'
      : stripeSession.status === 'expired'
        ? 'failed'
        : stripeSession.status === 'open'
          ? 'pending'
          : 'cancelled';

    const planId =
      stripeSession.metadata?.planId ??
      local?.payment?.productId.match(/^plan_([^_]+)_/)?.[1] ??
      null;
    const eventId = stripeSession.metadata?.eventId;
    const ownerId = userId ?? local?.payment?.userId;

    if (paid && local?.payment && ownerId) {
      await this.prisma.paymentSession.update({
        where: { id: local.id },
        data: { used: true, status: 'complete', paidAt: new Date() },
      });

      await this.prisma.payment.update({
        where: { id: local.payment.id },
        data: {
          status: 'succeeded',
          ...(stripeSession.subscription
            ? { stripeSubscriptionId: stripeSession.subscription as string }
            : {}),
        },
      });

      if (stripeSession.mode === 'payment') {
        if (eventId) {
          await this.prisma.event.update({
            where: { id: eventId },
            data: { isPrivatePaid: true },
          });
        } else if (planId) {
          await this.applyPlanToUser(planId, ownerId);
        }
      }

      if (stripeSession.mode === 'subscription' && planId) {
        const subId =
          typeof stripeSession.subscription === 'string'
            ? stripeSession.subscription
            : stripeSession.subscription?.id;
        if (subId) {
          await this.cancelOtherActiveSubscriptions(ownerId, subId);
        }
        await this.applyPlanToUser(planId, ownerId, subId);
      }
    }

    let invoice: PaymentInvoiceResponse | null = null;
    if (paid && local?.payment?.id) {
      try {
        invoice = await this.paymentInvoiceService.issueForPayment(
          local.payment.id,
          { sendEmail: false, includePdfBase64: true },
        );
      } catch (err) {
        console.error(
          `Invoice PDF skipped for payment ${local.payment.id} (checkout still verified):`,
          err,
        );
      }
    }

    return {
      status,
      planId,
      paymentStatus: stripeSession.payment_status,
      mode: stripeSession.mode,
      invoice,
    };
  }

  async downloadInvoicePdf(paymentId: string, userId: string) {
    return this.paymentInvoiceService.getInvoicePdfForUser(paymentId, userId);
  }

  private async handleSubscriptionCancellation(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: null,
        maxEventsOverride: null,
        maxGuestsOverride: null,
        maxEmailsOverride: null,
      },
    });

    await this.salonLifecycle.deleteSalonForUser(userId);
  }

  async checkActiveSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return false;

    const subs = await this.listActiveSubscriptionsForCustomer(
      user.stripeCustomerId,
    );
    return subs.length > 0;
  }

  /** Plan entitlement: active or trialing subscription only (excludes past_due). */
  async checkPaidSubscriptionEntitlement(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return false;

    const subs = await this.listPaidEntitledSubscriptionsForCustomer(
      user.stripeCustomerId,
    );
    return subs.length > 0;
  }

  private async resolveUserSubscription(
    userId: string,
    subscriptionId?: string,
  ): Promise<{ subscription: Stripe.Subscription; customerId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('NO_STRIPE_CUSTOMER');
    }

    if (subscriptionId) {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      if (customerId !== user.stripeCustomerId) {
        throw new BadRequestException('SUBSCRIPTION_NOT_FOUND');
      }
      return { subscription, customerId: user.stripeCustomerId };
    }

    const activeSubs = await this.listActiveSubscriptionsForCustomer(
      user.stripeCustomerId,
    );
    if (activeSubs.length === 0) {
      throw new BadRequestException('NO_ACTIVE_SUBSCRIPTION');
    }

    return { subscription: activeSubs[0], customerId: user.stripeCustomerId };
  }

  async cancelSubscriptionForUser(
    userId: string,
    options?: { subscriptionId?: string; immediately?: boolean },
  ) {
    const { subscription } = await this.resolveUserSubscription(
      userId,
      options?.subscriptionId,
    );

    if (options?.immediately) {
      await this.stripe.subscriptions.cancel(subscription.id);
      await this.prisma.payment.updateMany({
        where: { stripeSubscriptionId: subscription.id, userId },
        data: { status: 'canceled', stripeSubscriptionId: null },
      });

      const stillActive = await this.checkActiveSubscription(userId);
      if (!stillActive) {
        await this.handleSubscriptionCancellation(userId);
      }

      return {
        subscriptionId: subscription.id,
        canceled: true,
        cancelAtPeriodEnd: false,
      };
    }

    const updated = await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    return {
      subscriptionId: updated.id,
      canceled: false,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: updated.cancel_at ?? null,
    };
  }

  /** Stripe Checkout for a recurring catalog plan (new sub or plan change). */
  private async createSubscriptionCheckoutSession(
    userId: string,
    plan: {
      id: string;
      price: number;
      currency: string;
    },
    customerId: string,
    paymentId: string,
    options?: { planChange?: boolean },
  ): Promise<{ url: string }> {
    const stripePriceId = await this.ensureStripePriceId(plan as any);
    const type = PaymentType.event;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      ...this.checkoutPaymentSettings(),
      ...this.checkoutUrls(),
      locale: 'auto',
      billing_address_collection: 'required',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: {
        paymentId,
        planId: plan.id,
        userId,
        ...(options?.planChange ? { planChange: 'true' } : {}),
      },
      subscription_data: {
        metadata: { paymentId, planId: plan.id, userId },
      },
    });

    await this.prisma.paymentSession.create({
      data: {
        paymentId,
        stripeSessionId: session.id,
        status: 'pending',
        type,
      },
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }

    return { url: session.url };
  }

  async changeSubscription(userId: string, planId: string) {
    const plan = await this.resolvePlan(planId);

    if (plan.price <= 0) {
      const { subscription } = await this.resolveUserSubscription(userId);
      await this.stripe.subscriptions.cancel(subscription.id);
      await this.prisma.payment.updateMany({
        where: { stripeSubscriptionId: subscription.id, userId },
        data: { status: 'canceled', stripeSubscriptionId: null },
      });
      return this.activateFreePlan(userId, plan);
    }

    const { subscription, customerId } =
      await this.resolveUserSubscription(userId);
    const stripePriceId = await this.ensureStripePriceId(plan);

    const item = subscription.items.data[0];
    if (!item?.id) {
      throw new BadRequestException('SUBSCRIPTION_ITEM_NOT_FOUND');
    }

    const currentPriceId =
      typeof item.price === 'string' ? item.price : item.price?.id;
    if (currentPriceId === stripePriceId) {
      throw new BadRequestException('PLAN_ALREADY_ACTIVE');
    }

    const type = PaymentType.event;
    const productId = `plan_${plan.id}_${userId}`;

    let payment = await this.prisma.payment.findUnique({ where: { productId } });
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          productId,
          amount: plan.price,
          currency: plan.currency.toLowerCase(),
          type,
          status: 'pending',
          user: { connect: { id: userId } },
        },
      });
    } else if (payment.status !== 'pending') {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'pending', stripeSubscriptionId: null, amount: plan.price },
      });
    }

    const checkout = await this.createSubscriptionCheckoutSession(
      userId,
      plan,
      customerId,
      payment.id,
      { planChange: true },
    );

    return {
      url: checkout.url,
      subscriptionId: subscription.id,
      planId: plan.id,
      tier: plan.tier,
    };
  }
}
