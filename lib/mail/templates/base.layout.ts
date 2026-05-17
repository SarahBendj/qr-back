import { frontendBaseUrl } from '../brand';

const YEAR = new Date().getFullYear();

/** Matches event-simulation `EventEmailPreview` (light theme, email-safe). */
export const BRAND = {
  siteUrl: frontendBaseUrl(),
  violet: '#7c3aed',
  violetLight: '#a78bfa',
  bgPage: '#f3f0fa',
  bgCard: '#ffffff',
  bgRow: '#f7f5ff',
  bgRowAlt: '#edeafd',
  textDark: '#1a0a3c',
  textBody: '#4b4069',
  textMuted: '#9e8fbf',
  borderSolid: '#e4dff0',
  pillBg: 'rgba(124, 58, 237, 0.1)',
  pillBorder: 'rgba(124, 58, 237, 0.25)',
  qrBg: '#ede9fe',
  ctaFrom: '#7c3aed',
  ctaTo: '#a78bfa',
  contact: 'contact@smart-qr.pro',
};

export type EmailRow = {
  label: string;
  value: string;
  icon?: string;
};

export type EmailCta = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

export type EmailLayoutOptions = {
  title: string;
  pillLabel?: string;
  pillIcon?: string;
  headline: string;
  accent?: string;
  subhead: string;
  rows?: EmailRow[];
  qrBlock?: {
    title: string;
    description: string;
    imageSrc?: string;
    scanLabel?: string;
  };
  bodyHtml?: string;
  featuredCode?: string;
  ctas?: EmailCta[];
  ctaLinksHtml?: string;
  footerEventName?: string;
  footerExtra?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTopBar(): string {
  return `
    <tr>
      <td height="3" style="padding: 0; margin: 0; line-height: 3px; font-size: 0; background-color: ${BRAND.violet};">
        &nbsp;
      </td>
    </tr>
  `;
}

function renderPill(label: string): string {
  return `
    <tr>
      <td align="center" style="padding: 32px 32px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
        <span style="display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.violet}; background-color: ${BRAND.pillBg}; border: 1px solid ${BRAND.pillBorder}; border-radius: 999px; padding: 6px 14px;">
          ${esc(label)}
        </span>
      </td>
    </tr>
  `;
}

function renderHeadline(headline: string, accent?: string): string {
  const accentHtml = accent
    ? `<br><span style="color: ${BRAND.violet}; font-weight: 600;">${esc(accent)}</span>`
    : '';
  return `
    <tr>
      <td align="center" style="padding: 16px 32px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; line-height: 1.3; color: ${BRAND.textDark};">
          ${esc(headline)}${accentHtml}
        </h1>
      </td>
    </tr>
  `;
}

function renderSubhead(text: string): string {
  return `
    <tr>
      <td align="center" style="padding: 0 32px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.65; color: ${BRAND.textBody};">
        ${esc(text)}
      </td>
    </tr>
  `;
}

function renderRow(row: EmailRow, even: boolean): string {
  const bg = even ? BRAND.bgRowAlt : BRAND.bgRow;
  return `
    <tr>
      <td style="padding: 4px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bg}; border: 1px solid ${BRAND.borderSolid}; border-radius: 12px;">
          <tr>
            <td valign="middle" style="padding: 12px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
              <span style="display: block; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.textMuted}; margin-bottom: 2px;">${esc(row.label)}</span>
              <span style="font-size: 12px; font-weight: 600; color: ${BRAND.textDark}; line-height: 1.4; word-break: break-word;">${esc(row.value)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderRows(rows: EmailRow[]): string {
  return rows.map((r, i) => renderRow(r, i % 2 === 1)).join('');
}

function renderFeaturedCode(code: string): string {
  return `
    <tr>
      <td align="center" style="padding: 4px 24px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 420px; margin: 0 auto; background-color: ${BRAND.bgRowAlt}; border: 1px dashed ${BRAND.pillBorder}; border-radius: 14px;">
          <tr>
            <td align="center" style="padding: 28px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 12px; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.textMuted};">Code d'accès</p>
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; line-height: 1.15; letter-spacing: 0.1em; color: ${BRAND.violet}; word-break: break-all;">${esc(code)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderQrBlock(qr: NonNullable<EmailLayoutOptions['qrBlock']>): string {
  const scanLabel = qr.scanLabel ?? 'scanner';
  const img = qr.imageSrc
    ? `<img src="${esc(qr.imageSrc)}" alt="QR" width="72" height="72" style="display:block;border:0;border-radius:8px;" />`
    : '';

  return `
    <tr>
      <td style="padding: 8px 24px 20px; border-top: 1px solid ${BRAND.borderSolid}; border-bottom: 1px solid ${BRAND.borderSolid};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 16px 12px 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;" valign="middle">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: ${BRAND.textDark};">${esc(qr.title)}</p>
              <p style="margin: 0; font-size: 12px; line-height: 1.55; color: ${BRAND.textBody};">${qr.description}</p>
            </td>
            <td width="92" align="center" valign="middle" style="padding: 14px; background-color: ${BRAND.qrBg}; border: 1px dashed ${BRAND.pillBorder}; border-radius: 14px;">
              ${img}
              <p style="margin: 6px 0 0; font-size: 8px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.textMuted};">${esc(scanLabel)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderCta(cta: EmailCta): string {
  if (cta.variant === 'secondary') {
    return `
      <a href="${esc(cta.href)}" style="display: inline-block; margin: 6px 4px; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: ${BRAND.violet}; text-decoration: none; border: 1px solid ${BRAND.pillBorder}; border-radius: 999px; background-color: #ffffff;">
        ${esc(cta.label)}
      </a>
    `;
  }
  return `
    <a href="${esc(cta.href)}" style="display: inline-block; margin: 6px 4px; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 999px; background: linear-gradient(135deg, ${BRAND.ctaFrom} 0%, ${BRAND.ctaTo} 100%); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);">
      ${esc(cta.label)}
    </a>
  `;
}

function renderFooter(eventName?: string, footerExtra?: string): string {
  const name = eventName ? esc(eventName) : 'SmartQR';
  const contact = footerExtra ?? BRAND.contact;
  return `
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 16px 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 10px; line-height: 1.7; color: ${BRAND.textMuted}; letter-spacing: 0.02em;">
              &copy; ${YEAR} ${name}. Tous droits r&eacute;serv&eacute;s<br>
              123 Rue de la Paix, Paris, France
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 16px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; color: ${BRAND.textBody};">
              Des questions ? <a href="mailto:${esc(contact)}" style="color: ${BRAND.violet}; font-weight: 600; text-decoration: none;">Nous contacter</a>
              <span style="color: ${BRAND.textMuted};"> | Se d&eacute;sabonner</span>
            </td>
          </tr>
        </table>
  `;
}

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const ctas = options.ctas ?? [];

  const ctaBlock =
    ctas.length || options.ctaLinksHtml
      ? `
          <tr>
            <td align="center" style="padding: 8px 32px 28px;">
              ${ctas.map(renderCta).join('')}
              ${
                options.ctaLinksHtml
                  ? `<p style="margin: 14px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.6; color: ${BRAND.textBody};">${options.ctaLinksHtml}</p>`
                  : ''
              }
            </td>
          </tr>
        `
      : '';

  const bodyBlock = options.bodyHtml
    ? `
          <tr>
            <td align="center" style="padding: 0 32px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.7; color: ${BRAND.textBody};">
              ${options.bodyHtml}
            </td>
          </tr>
        `
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${esc(options.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bgPage};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.bgPage};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${BRAND.bgCard}; border-radius: 20px; border: 1px solid ${BRAND.borderSolid}; box-shadow: 0 8px 40px rgba(124, 58, 237, 0.12);">
          ${renderTopBar()}
          ${options.pillLabel ? renderPill(options.pillLabel) : ''}
          ${renderHeadline(options.headline, options.accent)}
          ${renderSubhead(options.subhead)}
          ${options.featuredCode ? renderFeaturedCode(options.featuredCode) : ''}
          ${options.rows?.length ? renderRows(options.rows) : ''}
          ${options.qrBlock ? renderQrBlock(options.qrBlock) : ''}
          ${bodyBlock}
          ${ctaBlock}
        </table>
        ${renderFooter(options.footerEventName, options.footerExtra)}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
