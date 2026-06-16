import { normalizeEventCategory } from '../../src/event/event-lookup';
import { buildSalonEventAbsoluteUrl } from '../../src/salon/salon-event-url';

const DEFAULT_LOGO_URL =
  'https://pub-36ea8e6f26f74e1c91f6de47f054dad7.r2.dev/smartQR/logo/logo.png';

export function brandLogoUrl(): string {
  const fromEnv = process.env.BRAND_LOGO_URL?.trim();
  if (fromEnv) return fromEnv;

  const base = process.env.R2_DISPLAY_PUBLIC_URL?.replace(/\/$/, '');
  if (base) {
    return `${base}/smartQR/logo/logo.png`;
  }

  return DEFAULT_LOGO_URL;
}

export function frontendBaseUrl(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    process.env.HOST?.replace(/\/$/, '') ||
    'https://smart-qr.pro'
  );
}

/** Public API origin for one-click email links (confirm-join redirect). */
export function apiBaseUrl(): string {
  return (
    process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
    process.env.HOST?.replace(/\/$/, '') ||
    'http://localhost:5000'
  );
}

export function eventPublicUrl(
  category: string,
  slug: string,
  salonMark?: string | null,
): string {
  const cat = normalizeEventCategory(category);
  const sl = slug.trim();
  if (salonMark?.trim()) {
    return buildSalonEventAbsoluteUrl(salonMark.trim(), cat, sl);
  }
  return `${frontendBaseUrl()}/smart-event/${encodeURIComponent(cat)}/${encodeURIComponent(sl)}`;
}

/**
 * One-click RSVP link: hits the API, confirms in DB, then redirects to the frontend event page.
 */
export function eventConfirmJoinUrl(
  category: string,
  slug: string,
  email: string,
  confirm: boolean,
  _salonMark?: string | null,
): string {
  const cat = encodeURIComponent(normalizeEventCategory(category));
  const sl = encodeURIComponent(slug.trim());
  const encodedEmail = encodeURIComponent(email.trim());
  return `${apiBaseUrl()}/event/confirm-join/${cat}/${sl}/${encodedEmail}/${confirm ? 'true' : 'false'}`;
}
