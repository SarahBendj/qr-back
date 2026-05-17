import { ForbiddenException } from '@nestjs/common';
import { StripeService } from 'src/stripe/stripe.service';

/** Blocks features until the user has paid for a plan (subscription or one-time plan checkout). */
export async function assertUserHasPaidPlan(
  stripeService: StripeService,
  userId: string,
  code = 'REDIRECT_TO_PLAN',
): Promise<void> {
  const { planPaid } = await stripeService.getPlanStatus(userId);
  if (!planPaid) {
    throw new ForbiddenException(code);
  }
}
