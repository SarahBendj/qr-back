import {
  buildSalonEventAbsoluteUrl,
  buildSalonEventConfirmUrl,
} from '../../src/salon/salon-event-url';

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

export function eventPublicUrl(
  category: string,
  slug: string,
  salonMark?: string | null,
): string {
  if (salonMark?.trim()) {
    return buildSalonEventAbsoluteUrl(salonMark.trim(), category, slug);
  }
  return `${frontendBaseUrl()}/smart-event/${category}/${slug}`;
}

export function eventConfirmJoinUrl(
  category: string,
  slug: string,
  email: string,
  confirm: boolean,
  salonMark?: string | null,
): string {
  if (salonMark?.trim()) {
    return buildSalonEventConfirmUrl(
      salonMark.trim(),
      category,
      slug,
      email,
      confirm,
    );
  }
  const encodedEmail = encodeURIComponent(email.trim());
  return `${frontendBaseUrl()}/smart-event/confirm/${category}/${slug}/${encodedEmail}/${confirm ? 'true' : 'false'}`;
}
