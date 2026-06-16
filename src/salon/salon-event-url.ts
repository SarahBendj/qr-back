import { normalizeEventCategory } from '../event/event-lookup';

function frontendOrigin(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    process.env.HOST?.replace(/\/$/, '') ||
    'https://smart-qr.pro'
  );
}

function isLocalFrontend(): boolean {
  return /localhost|127\.0\.0\.1/i.test(frontendOrigin());
}

function salonProductionSuffix(): string {
  const fromEnv =
    process.env.SALON_HOST_SUFFIX?.trim().replace(/^\./, '') ||
    process.env.NEXT_PUBLIC_SALON_HOST_SUFFIX?.trim().replace(/^\./, '') ||
    process.env.SALON_PUBLIC_HOST?.trim().replace(/^\./, '');
  if (fromEnv) return fromEnv.toLowerCase();

  try {
    const base = frontendOrigin();
    const host = new URL(base.startsWith('http') ? base : `https://${base}`)
      .hostname.replace(/^www\./i, '')
      .toLowerCase();
    if (host && !/localhost|127\.0\.0\.1/i.test(host)) return host;
  } catch {
    /* fall through */
  }

  return 'smart-qr.pro';
}

function salonProtocol(): string {
  return (
    process.env.SALON_PUBLIC_PROTOCOL?.trim() ||
    process.env.NEXT_PUBLIC_SALON_PROTOCOL?.trim() ||
    'https'
  );
}

function buildSalonTenantUrl(mark: string): string {
  const m = mark.trim().toLowerCase();
  return `${salonProtocol()}://${m}.${salonProductionSuffix()}`;
}

export function salonEventPath(category: string, slug: string): string {
  const cat = encodeURIComponent(normalizeEventCategory(category));
  const sl = encodeURIComponent(slug.trim());
  return `/event/${cat}/${sl}`;
}

/**
 * Canonical public URL for a salon-branded event (emails, PDF QR, share links).
 * Prod → https://{mark}.smart-qr.pro/event/{category}/{slug}
 * Dev  → {FRONTEND_URL}/salon/{mark}/event/{category}/{slug}
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

  if (isLocalFrontend()) {
    return `${frontendOrigin()}/salon/${encodeURIComponent(m)}/event/${cat}/${sl}`;
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

  if (!m || isLocalFrontend()) {
    return `${frontendOrigin()}/salon/${encodeURIComponent(m)}/event/confirm/${cat}/${sl}/${encodedEmail}/${action}`;
  }

  return `${buildSalonTenantUrl(m)}/event/confirm/${cat}/${sl}/${encodedEmail}/${action}`;
}
