import { PlanTier } from '@prisma/client';

export const CUSTOM_PLAN_MIN_EUR = 8;
export const CUSTOM_PLAN_MAX_EUR = 500;
export const CUSTOM_MIN_EVENTS = 3;
export const CUSTOM_MAX_EVENTS = 50;
export const CUSTOM_MIN_EMAILS = 100;
export const CUSTOM_MAX_EMAILS = 10_000;
export const CUSTOM_EMAIL_STEP = 100;
export const CUSTOM_EMAILS_PER_EVENT = 100;

function includedEmailsForEvents(events: number): number {
  return events * CUSTOM_EMAILS_PER_EVENT;
}

function maxBillableEmailsAtPeak(): number {
  return Math.max(
    0,
    CUSTOM_MAX_EMAILS - includedEmailsForEvents(CUSTOM_MAX_EVENTS),
  );
}

export function computeCustomPlanPriceEuros(
  maxEvents: number,
  maxEmails: number,
): number {
  const events = Math.min(
    CUSTOM_MAX_EVENTS,
    Math.max(CUSTOM_MIN_EVENTS, Math.round(maxEvents)),
  );
  const emails = Math.min(
    CUSTOM_MAX_EMAILS,
    Math.max(
      CUSTOM_MIN_EMAILS,
      Math.round(maxEmails / CUSTOM_EMAIL_STEP) * CUSTOM_EMAIL_STEP,
    ),
  );

  const eventsRange = CUSTOM_MAX_EVENTS - CUSTOM_MIN_EVENTS || 1;
  const eventsPart = ((events - CUSTOM_MIN_EVENTS) / eventsRange) * 200;

  const included = includedEmailsForEvents(events);
  const extraEmails = Math.max(0, emails - included);
  const billableRange = maxBillableEmailsAtPeak() || 1;
  const emailsPart = (extraEmails / billableRange) * 292;

  const raw = CUSTOM_PLAN_MIN_EUR + eventsPart + emailsPart;
  return Math.round(
    Math.min(CUSTOM_PLAN_MAX_EUR, Math.max(CUSTOM_PLAN_MIN_EUR, raw)),
  );
}

export function isCustomPlanTier(_tier: PlanTier): boolean {
  return false;
}

export function assertCustomPlanAmount(
  amount: number,
  maxEvents: number,
  maxEmails: number,
): void {
  const expected = computeCustomPlanPriceEuros(maxEvents, maxEmails);
  if (Math.abs(amount - expected) > 0.01) {
    throw new Error('CUSTOM_PLAN_PRICE_MISMATCH');
  }
}
