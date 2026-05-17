import { PlanTier } from '@prisma/client';

/** Plans at or above this price (cents) unlock custom salon */
export const SALON_MIN_PRICE_CENTS = 7000;

export const SALON_PRO_TIERS: PlanTier[] = [PlanTier.BUSINESS];

export function planGrantsCustomSalon(
  tier: PlanTier | string | null | undefined,
  priceCents: number | null | undefined,
): boolean {
  const t = String(tier ?? '').toUpperCase();
  if (SALON_PRO_TIERS.some((p) => p === tier || String(p) === t)) {
    return true;
  }
  if (priceCents != null && priceCents >= SALON_MIN_PRICE_CENTS) {
    return true;
  }
  return false;
}
