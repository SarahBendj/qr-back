import { normalizeEventCategory } from '../event/event-lookup';

function frontendOrigin(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    process.env.HOST?.replace(/\/$/, '') ||
    'https://smart-qr.pro'
  );
}

/** Path-based salon root: {origin}/salon/{mark}. */
function buildSalonTenantUrl(mark: string): string {
  const m = mark.trim().toLowerCase();
  return `${frontendOrigin()}/salon/${encodeURIComponent(m)}`;
}

export function salonEventPath(category: string, slug: string): string {
  const cat = encodeURIComponent(normalizeEventCategory(category));
  const sl = encodeURIComponent(slug.trim());
  return `/event/${cat}/${sl}`;
}

/**
 * Canonical public URL for a salon-branded event (emails, PDF QR, share links).
 * → {FRONTEND_URL}/salon/{mark}/event/{category}/{slug}
 */
export function buildSalonEventAbsoluteUrl(
  mark: string,
  category: string,
  slug: string,
): string {
  const m = mark.trim().toLowerCase();
  const cat = encodeURIComponent(normalizeEventCategory(category));
  const sl = encodeURIComponent(slug.trim());

  if (!m) {
    return `${frontendOrigin()}/smart-event/${cat}/${sl}`;
  }

  return `${buildSalonTenantUrl(m)}${salonEventPath(category, slug)}`;
}

export function eventPublicUrlForSalon(
  mark: string,
  category: string,
  slug: string,
): string {
  return buildSalonEventAbsoluteUrl(mark, category, slug);
}

/** @deprecated Prefer eventConfirmJoinUrl() in lib/mail/brand.ts (API redirect). */
export function buildSalonEventConfirmUrl(
  mark: string,
  category: string,
  slug: string,
  email: string,
  confirm: boolean,
): string {
  const m = mark.trim().toLowerCase();
  const cat = encodeURIComponent(normalizeEventCategory(category));
  const sl = encodeURIComponent(slug.trim());
  const encodedEmail = encodeURIComponent(email.trim());
  const action = confirm ? 'true' : 'false';

  return `${buildSalonTenantUrl(m)}/event/confirm/${cat}/${sl}/${encodedEmail}/${action}`;
}
