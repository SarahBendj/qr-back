import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  Headers,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import {
  CancelSubscriptionDto,
  ChangeSubscriptionDto,
  CreatePaymentDto,
  CreateSubscriptionDto,
} from './dto/create-subscription.dto';
import Stripe from 'stripe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /** Public catalog (pricing page) */
  @Get('plans')
  listPlans() {
    return this.stripeService.listPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('plan-details')
  planDetails(@Req() req) {
    return this.stripeService.getPlanDetails(req.user.id);
  }


  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 8, ttl: 86400000 } })
  @Post('create-payment-intent')
  async pay(@Body() dto: CreatePaymentDto, @Req() req) {
    const userId = req.user.id;
    return this.stripeService.createPaymentIntent(
      userId,
      dto.planId,
      dto.amount,
      dto.currency,
      dto.eventId,
      dto.maxEvents,
      dto.maxEmails,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 86400000 } })
  @Post('create-subscription')
  async subscribe(@Body() dto: CreateSubscriptionDto, @Req() req) {
    const userId = req.user.id;
    return this.stripeService.createSubscription(userId, dto.planId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('manage')
  async manage(@Req() req) {
    const userId = req.user.id;
    return this.stripeService.createCustomerPortalSession(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-subscription')
  cancelSubscription(@Body() dto: CancelSubscriptionDto, @Req() req) {
    return this.stripeService.cancelSubscriptionForUser(req.user.id, {
      subscriptionId: dto.subscriptionId,
      immediately: dto.immediately,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 86400000 } })
  @Post('change-subscription')
  changeSubscription(@Body() dto: ChangeSubscriptionDto, @Req() req) {
    return this.stripeService.changeSubscription(req.user.id, dto.planId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req,
    @Res() res,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripe = this.stripeService.getStripeInstance();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
    }
    if (!signature) {
      return res.status(400).send('Missing stripe-signature header');
    }

    const rawBody: Buffer | undefined =
      req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : undefined);
    if (!rawBody) {
      return res.status(400).send('Missing raw body for webhook verification');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await this.stripeService.handleWebhook(event);
      return res.json({ received: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      return res.status(500).send('Webhook handler error');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-payment-session')
  async checkSessionEndpoint(@Query('sessionId') sessionId: string) {
    return this.stripeService.checkSession(sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-checkout')
  verifyCheckout(@Query('session_id') sessionId: string, @Req() req) {
    return this.stripeService.verifyCheckoutSession(sessionId, req.user.id);
  }

  /** Télécharger la facture PDF (référence + offre + date) */
  @UseGuards(JwtAuthGuard)
  @Get('invoice/:paymentId')
  async downloadInvoice(
    @Param('paymentId') paymentId: string,
    @Req() req,
    @Res({ passthrough: true }) res,
  ) {
    const { buffer, filename } =
      await this.stripeService.downloadInvoicePdf(paymentId, req.user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }
}
