import type { SalonEventBrand } from '../salon-brand';

export type SalonInviteMailOptions = {
  name: string;
  eventTitle: string;
  confirmUrl: string;
  declineUrl: string;
  eventDateTime?: string;
  eventLocation?: string;
  accessCode?: string;
  brand: SalonEventBrand;
  /** When set, logo is embedded inline (cid) and displays in all mail clients */
  logoCid?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eceae6; font-family: Georgia, 'Times New Roman', serif;">
        <span style="display: block; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #8a8478; margin-bottom: 4px;">${esc(label)}</span>
        <span style="font-size: 15px; line-height: 1.45; color: #1c1b19;">${esc(value)}</span>
      </td>
    </tr>
  `;
}

export const salonInviteEmail = (opts: SalonInviteMailOptions): string => {
  const brand = esc(opts.brand.brandName);
  const contact = opts.brand.contactEmail?.trim();
  const footerLine = opts.brand.footerLine?.trim();

  const details = [
    detailRow('Événement', opts.eventTitle),
    ...(opts.eventDateTime ? [detailRow('Date', opts.eventDateTime)] : []),
    ...(opts.eventLocation ? [detailRow('Lieu', opts.eventLocation)] : []),
    ...(opts.accessCode?.trim()
      ? [detailRow("Code d'accès", opts.accessCode.trim())]
      : []),
  ].join('');

  const logoSrc = opts.logoCid
    ? `cid:${opts.logoCid}`
    : opts.brand.logoUrl?.trim();
  const logoBlock = logoSrc
    ? `<img src="${logoSrc}" alt="${brand}" width="120" style="display:block; max-width:120px; height:auto; margin:0 auto 28px; border:0;" />`
    : `<p style="margin:0 0 28px; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: #1c1b19;">${brand}</p>`;

  const contactFooter = contact
    ? `<a href="mailto:${esc(contact)}" style="color: #1c1b19; text-decoration: none;">${esc(contact)}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation : ${esc(opts.eventTitle)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f6f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f6f3;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background:#ffffff; border:1px solid #e8e6e1;">
          <tr>
            <td style="height:2px; background:#1c1b19; font-size:0; line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding: 40px 40px 8px; font-family: Georgia, 'Times New Roman', serif;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 12px; font-family: Georgia, 'Times New Roman', serif;">
              <p style="margin:0; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #8a8478;">${brand}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 8px 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
              <h1 style="margin:0; font-size: 26px; font-weight: 400; line-height: 1.35; color: #1c1b19;">
                Vous êtes prié(e) de venir à<br>
                <span style="font-style: italic;">${esc(opts.eventTitle)}</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.75; color: #4a4843; text-align: center;">
              Bonjour ${esc(opts.name)},<br>
              ${brand} a le plaisir de vous inviter à cet événement.
              Merci de bien vouloir confirmer votre présence.
              Votre invitation est jointe en PDF.
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${details}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 32px 40px 40px;">
              <a href="${esc(opts.confirmUrl)}" style="display:inline-block; margin:0 6px 12px; padding:14px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; letter-spacing:0.04em; color:#ffffff; text-decoration:none; background:#1c1b19;">Confirmer ma présence</a>
              <a href="${esc(opts.declineUrl)}" style="display:inline-block; margin:0 6px 12px; padding:14px 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:13px; color:#1c1b19; text-decoration:none; border:1px solid #d4d0c8;">Décliner</a>
              <p style="margin:20px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.6; color:#8a8478;">
                Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message.
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">
          <tr>
            <td align="center" style="padding: 20px 16px 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; color: #8a8478; letter-spacing: 0.04em;">
              ${brand}${footerLine ? ` | ${esc(footerLine)}` : ''}
            </td>
          </tr>
          ${
            contactFooter
              ? `<tr><td align="center" style="padding: 0 16px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; color: #8a8478;">${contactFooter}</td></tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
