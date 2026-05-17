import { ForbiddenException } from '@nestjs/common';
import { PlanTier } from '@prisma/client';

export function assertBusinessPlan(plan: PlanTier | null | undefined): void {
  if (plan !== PlanTier.BUSINESS) {
    throw new ForbiddenException('BULK_INVITE_BUSINESS_ONLY');
  }
}
