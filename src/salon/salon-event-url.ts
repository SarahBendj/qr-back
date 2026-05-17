const SALON_SUFFIX =
  process.env.SALON_HOST_SUFFIX?.trim().replace(/^\./, '') ??
  process.env.NEXT_PUBLIC_SALON_HOST_SUFFIX?.trim().replace(/^\./, '') ??
  'smartqr.pro';

const SALON_PROTOCOL = process.env.NEXT_PUBLIC_SALON_PROTOCOL?.trim() || 'https';

function isSalonDev(): boolean {
  const front =
    process.env.FRONTEND_URL?.replace(/\/$/, '') ??
    process.env.HOST?.replace(/\/$/, '') ??
    '';
  return /localhost|127\.0\.0\.1/i.test(front) || process.env.NODE_ENV === 'development';
}

function frontendOrigin(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    process.env.HOST?.replace(/\/$/, '') ||
    'https://smart-qr.pro'
  );
}

export function salonEventPath(category: string, slug: string): string {
  const cat = encodeURIComponent((category || 'event').trim());
  const sl = encodeURIComponent(slug.trim());
  return `/event/${cat}/${sl}`;
}

export function buildSalonEventAbsoluteUrl(
  mark: string,
  category: string,
  slug: string,
): string {
  const m = mark.trim().toLowerCase();
  const cat = category.trim() || 'event';
  const sl = slug.trim();

  if (isSalonDev()) {
    return `${frontendOrigin()}/salon/${encodeURIComponent(m)}/event/${encodeURIComponent(cat)}/${encodeURIComponent(sl)}`;
  }

  return `${SALON_PROTOCOL}://${m}.${SALON_SUFFIX}${salonEventPath(cat, sl)}`;
}

export function eventPublicUrlForSalon(
  mark: string,
  category: string,
  slug: string,
): string {
  return buildSalonEventAbsoluteUrl(mark, category, slug);
}

export function buildSalonEventConfirmUrl(
  mark: string,
  category: string,
  slug: string,
  email: string,
  confirm: boolean,
): string {
  const m = mark.trim().toLowerCase();
  const cat = encodeURIComponent((category || 'event').trim());
  const sl = encodeURIComponent(slug.trim());
  const encodedEmail = encodeURIComponent(email.trim());
  const action = confirm ? 'true' : 'false';

  if (isSalonDev()) {
    return `${frontendOrigin()}/salon/${encodeURIComponent(m)}/event/confirm/${cat}/${sl}/${encodedEmail}/${action}`;
  }

  return `${SALON_PROTOCOL}://${m}.${SALON_SUFFIX}/event/confirm/${cat}/${sl}/${encodedEmail}/${action}`;
}
