import { Controller, Post, Body, Get, Req, Res, Headers, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreatePaymentDto, CreateSubscriptionDto } from './dto/create-subscription.dto';
import Stripe from 'stripe';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';



@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 8, ttl:  86400000 } })
  @Post('create-payment-intent')
  async pay(@Body() dto: CreatePaymentDto , @Req() req) 
  {
    const userId = req.user.id
    return this.stripeService.createPaymentIntent(userId, dto.productId, dto.amount, dto.currency, dto.type);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl:  86400000 } })
  
  @Post('create-subscription')
  async subscribe(@Body() dto: CreateSubscriptionDto, @Req() req) {
    const userId = req.user.id
    return this.stripeService.createSubscription( userId, dto.productId, dto.priceId , dto.type);
  }
  @UseGuards(JwtAuthGuard)
  @Get('manage')
  async manage(@Req() req) {
    const userId = req.user.id;
    const session = await this.stripeService.createCustomerPortalSession(userId);
    return session;
  }


  @Post('webhook')
  async handleWebhook(
    @Req() req,
    @Res() res,
    @Headers('stripe-signature') signature: string
  ) {
    
    console.log('hna ?')
    const stripe = this.stripeService.getStripeInstance();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
      const obj: any = event.data.object;

const metadata =
  obj?.metadata ||
  obj?.subscription_details?.metadata ||
  null;

console.log({
  eventType: event.type,
  metadata,
});


      
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const resu =await this.stripeService.handleWebhook(event);
      // console.log(resu)
      res.json({ received: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      res.status(500).send('Webhook handler error');
    }
  }
 
  @UseGuards(JwtAuthGuard)
  @Get('check-payment-session')
  async checkSessionEndpoint(@Query('sessionId') sessionId: string) {
    console.log('sessionchel')
  const res =await this.stripeService.checkSession(sessionId)
  return res
}


}
