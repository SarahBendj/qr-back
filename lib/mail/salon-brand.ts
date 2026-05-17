/** Content-ID for inline logo in HTML: <img src="cid:salon-brand-logo" /> */
export const SALON_LOGO_CID = 'salon-brand-logo';

/** White-label context for Business plan event invitations */
export type SalonEventBrand = {
  brandName: string;
  logoUrl?: string;
  contactEmail?: string;
  footerLine?: string;
};

export function r2PublicAssetUrl(key: string | null | undefined): string | undefined {
  const k = key?.trim();
  if (!k) return undefined;
  const base = process.env.R2_DISPLAY_PUBLIC_URL?.replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}/${k.replace(/^\//, '')}`;
}

export type InlineLogoAttachment = {
  contentId: string;
  content: Buffer;
  filename: string;
  contentType: string;
};

/** Fetches salon logo for inline email embedding (CID). External img URLs are often blocked in inboxes. */
export async function fetchInlineLogoAttachment(
  logoUrl: string | undefined,
): Promise<InlineLogoAttachment | null> {
  const url = logoUrl?.trim();
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const contentType =
      res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    let filename = 'logo.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      filename = 'logo.jpg';
    } else if (contentType.includes('webp')) {
      filename = 'logo.webp';
    } else if (contentType.includes('gif')) {
      filename = 'logo.gif';
    }

    return {
      contentId: SALON_LOGO_CID,
      content: buffer,
      filename,
      contentType,
    };
  } catch {
    return null;
  }
}
