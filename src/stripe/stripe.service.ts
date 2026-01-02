import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service'; // ton service Prisma
import { PaymentType } from '@prisma/client';


@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const secretKey = this.configService.getOrThrow('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey);
  }

  getStripeInstance(): Stripe {
    return this.stripe;
  }

  async createPaymentIntent(
    userId: string,
    productId :string,
    amount: number,
    currency: string,
    type : PaymentType
  ) {
   const payment = await this.prisma.payment.create({
  data: {
    productId: productId,
    amount: amount*100,
    currency: "usd",
    type: PaymentType.privacy_event,
    status: "pending",

    user: {
      connect: {
        id: userId,
      },
    },
  },
});


    // PaymentIntent Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount : amount * 100,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        paymentId: payment.id,
         type,
         productId : productId
      },
    });
     const session = await this.prisma.paymentSession.create({
    data: {
      paymentId: payment.id,
      stripeSessionId: paymentIntent.id,
      status: paymentIntent.status,
      type,
    },
  });


    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

 

    return { clientSecret: paymentIntent.client_secret, paymentId: payment.id , paymentToken: session.token };
  }

  async createSubscription(
    userId: string,
    productId : string,
    priceId: string,
    type: PaymentType,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    let customerId = user.stripeCustomerId;

    if (!customerId) {
    const customer = await this.stripe.customers.create({
  email: user.email,
  metadata: { userId },
});



      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }
    let payment : any ;
   payment = await this.prisma.payment.findUnique({
  where: {
      productId,
      userId,
    },
});

if (payment) {
  if (payment.status === "succeeded") {
     throw new BadRequestException('PAYMENT_ALREADY_DONE')
    };
  

} else {
  // Cas 3 : aucun paiement, on crée un nouveau
  payment = await this.prisma.payment.create({
    data: {
      productId: productId,
      amount: 5.99,
      currency: "usd",
      type: PaymentType.privacy_event,
      status: "pending",
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });

    }

  const session = await this.stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],

    metadata: {
      paymentId: payment.id,
      type,
    },

    subscription_data: {
      metadata: {
        paymentId: payment.id,
        type,
        productId
      },
    },

    success_url: `${process.env.HOST}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.HOST}/payment/cancel`,
  });

  // 3️⃣ Store session
  await this.prisma.paymentSession.create({
    data: {
      paymentId: payment.id,
      stripeSessionId: session.id,
      status: 'pending',
      type,
    },
  });

  // 4️⃣ RETURN THE SESSION URL (IMPORTANT)
  return {
    checkoutSessionId: session.id,
    paymentUrl: session.url,
  };

  }


  async createCustomerPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe customer ID');
    }

    // Create a Stripe Customer Portal session
    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: process.env.FRONTEND_BILLING_RETURN_URL 
    });

    //  Return the portal URL
    return { url: portalSession.url };
  }
async handleWebhook(event: Stripe.Event) {
   const obj: any = event.data.object; 
  try {
    
    // ----------------------------
    // ONE_TIME PAYMENT
    // ----------------------------
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentId = paymentIntent.metadata?.paymentId;
      const productId = paymentIntent.metadata?.productId;
      const type = paymentIntent.metadata?.type;

      if (!paymentId) return;

  
      await this.prisma.paymentSession.updateMany({
        where: { stripeSessionId: paymentIntent.id },
        data: { used: true, status: 'complete' },
      });

      const record = await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'succeeded' },
      });

      if (!record) return;

      switch (type) {
        case 'privacy_event':
          await this.prisma.event.update({
            where: { id : productId },
            data: { isPrivatePaid: true },
          });
          break;

        case 'privacy_candidate':
          await this.prisma.candidate.updateMany({
            where: { id : productId },
            data: { isPrivatePaid: true },
          });
          break;

  
      }
    }

    // ----------------------------
    // SUBSCRIPTION
    // ----------------------------
     if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        const subscription = obj as Stripe.Subscription;
        console.log(subscription)

        // Fetch payment linked to subscription
        const payment = await this.prisma.payment.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!payment) return;

        // Upgrade / Downgrade plan
        // const newPlanId = subscription.items.data[0].price.id;
        // if (payment.plan !== newPlanId) {
        //   await this.prisma.payment.update({
        //     where: { id: payment.id },
        //     data: { plan: newPlanId },
        //   });

        //   // Optionally update user access/features
        //   await this.prisma.candidate.updateMany({
        //     where: { userId: payment.userId },
        //     data: { status: 'active' },
        //   });
        // }

        // Scheduled cancellation or immediate cancel
        if (subscription.cancel_at || subscription.status === 'canceled') {
          await this.handleSubscriptionCancellation(payment.userId);
        }
      }

    // ----------------------------
    // CHECKOUT SESSION COMPLETED (optional)
    // ----------------------------
    if (event.type === 'checkout.session.completed') {
      const session = obj as Stripe.Checkout.Session;
    
      if (!session.metadata?.paymentId) return;
      console.log(session.metadata.paymentId)


      // 1️⃣ Find the payment session first
     const sessionRecord = await this.prisma.paymentSession.findUnique({
      where: { stripeSessionId: session.id },
    });
    console.log(sessionRecord)

    if (!sessionRecord) {
      console.log('No payment session found for session.id:', session.id);
      return;
    }

    // Mark session as used
    await this.prisma.paymentSession.update({
      where: { id: sessionRecord.id },
      data: { used: true, status: 'complete' },
    });

    // Ensure subscription ID is a string
      const subscriptionId = session.subscription as string | null;
      console.log('subsId' , subscriptionId)

    // 3️⃣ Update the payment with the subscription ID
    await this.prisma.payment.update({
      where: { id: sessionRecord.paymentId },
      data: { stripeSubscriptionId: subscriptionId },
    });


          console.log('Checkout session completed:', session.id);
          return;
        }

    // ----------------------------
    // INVOICE PAYMENT SUCCEEDED
    // ----------------------------
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = obj as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription as string
      console.log(subscriptionId)

      if (!subscriptionId) return;
      

      const payment = await this.prisma.payment.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });
      console.log(payment)

      if (!payment) return;

      const thisd =await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'succeeded' },
      });
      console.log(thisd)
      console.log('thiiiiiiiiiiiiiiiiiiiiiiiiiiiiis')
      // SaaS subscription effect
      await this.prisma.candidate.update({
        where: { id: payment.productId }, 
        data: { status: 'active' },
      });
      await  this.prisma.portfolio.update({
        data : { isPaid : true},
        where : { userId: payment.userId },
      })
      console.log('Subscription payment succeeded for:', subscriptionId);
      return;
    }
  } catch (err) {
    console.error('Stripe webhook error:', err);
  }
}

async checkSession(sessionId: string) {
  if (!sessionId) throw new BadRequestException('sessionId is required');

  // Vérifie si le token existe déjà
  const session = await this.prisma.paymentSession.findUnique({
    where: { token: sessionId },
  });

  if (session && session.used) {
    return {
      used: true,
      message: 'This payment session has already been used',
    };
  } else {
    return {
      used: false,
      clientSecret: null,
    };
  }
}

 private async handleSubscriptionCancellation(userId: string) {
    // Fetch candidate with portfolio
    const candidate = await this.prisma.candidate.findFirst({
      where: { userId },
      include: { user: { include: { portfolio: true } } },
    });

    if (candidate) {
      // Delete portfolio if exists
      if (candidate.user.portfolio) {
        await this.prisma.portfolio.delete({ where: { userId } });
      }

      // Delete candidate profile
      await this.prisma.candidate.delete({ where: { id: candidate.id } });
    }

    // Downgrade user model
    await this.prisma.user.update({
      where: { id: userId },
      data: { model: 'STANDARD' , subscription : "FREE" },
    });
  }


async checkActiveSubscription(userId: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.stripeCustomerId) return false;

  const subscriptions = await this.stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'active',
  });
  return subscriptions.data.length > 0;
}



  // ----------------------------
  // 3️⃣ Résiliation (optionnel)
  // ----------------------------
  async cancelSubscription(subscriptionId: string) {
    // const canceled = await this.stripe.subscriptions.del(subscriptionId);
    // // tu peux aussi mettre à jour le Payment record correspondant si tu veux
    // return { subscriptionId: canceled.id, status: canceled.status };
  }
}
