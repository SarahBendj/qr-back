import { PDFDocument, rgb } from 'pdf-lib';
import { brandLogoUrl } from '../mail/brand';
import { registerPdfFonts } from '../pdf/embed-fonts';
import { wrapText } from '../pdf/text-layout';
import type { PaymentInvoiceData } from './payment-invoice.types';

const C = {
  pageBg: rgb(0.98, 0.98, 1),
  ink: rgb(0.08, 0.04, 0.18),
  muted: rgb(0.45, 0.4, 0.55),
  rule: rgb(0.9, 0.88, 0.95),
  accent: rgb(0.486, 0.227, 0.929),
  accentBg: rgb(0.96, 0.94, 1),
  white: rgb(1, 1, 1),
};

export function buildInvoiceReference(
  paymentId: string,
  issuedAt: Date,
): string {
  const year = issuedAt.getFullYear();
  const suffix = paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `FAC-${year}-${suffix}`;
}

export function formatInvoiceDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export async function generatePaymentInvoicePdf(
  data: PaymentInvoiceData,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const { regular, bold } = await registerPdfFonts(pdf);
  const margin = 52;
  const contentW = width - margin * 2;
  let y = height - margin;

  page.drawRectangle({ x: 0, y: 0, width, height, color: C.pageBg });

  const drawAt = (
    text: string,
    x: number,
    lineY: number,
    size: number,
    useBold = false,
    color = C.ink,
  ) => {
    page.drawText(text, {
      x,
      y: lineY,
      size,
      font: useBold ? bold : regular,
      color,
    });
  };

  try {
    const logoRes = await fetch(brandLogoUrl());
    if (logoRes.ok) {
      const bytes = await logoRes.arrayBuffer();
      const logo = await pdf.embedPng(bytes);
      const logoW = 120;
      const logoH = (logo.height / logo.width) * logoW;
      page.drawImage(logo, {
        x: margin,
        y: y - logoH,
        width: logoW,
        height: logoH,
      });
    }
  } catch {
    drawAt('SmartQR', margin, y - 16, 16, true, C.accent);
  }

  const factureLabel = 'FACTURE';
  const factureW = bold.widthOfTextAtSize(factureLabel, 22);
  drawAt(factureLabel, width - margin - factureW, y - 8, 22, true, C.accent);
  y -= 64;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: C.rule,
  });
  y -= 32;

  const colW = contentW / 2 - 16;
  drawAt('Référence', margin, y, 9, true, C.muted);
  drawAt(data.reference, margin, y - 16, 12, true);
  drawAt('Date', margin + colW + 32, y, 9, true, C.muted);
  drawAt(data.issuedAtLabel, margin + colW + 32, y - 16, 12, true);
  y -= 48;

  drawAt('Client', margin, y, 9, true, C.muted);
  drawAt(data.customerName, margin, y - 16, 12, true);
  drawAt(data.customerEmail, margin, y - 32, 10, false, C.muted);
  y -= 56;

  const featureCount = Math.min(data.offer.features?.length ?? 0, 4);
  const descLines = data.offer.description?.trim()
    ? wrapText(data.offer.description, contentW - 40, regular, 10).slice(0, 3)
    : [];
  const boxInnerH =
    24 +
    20 +
    (descLines.length ? descLines.length * 14 + 8 : 0) +
    (data.offer.tier ? 16 : 0) +
    featureCount * 14 +
    16;
  const boxH = Math.max(boxInnerH, 100);

  page.drawRectangle({
    x: margin,
    y: y - boxH,
    width: contentW,
    height: boxH,
    color: C.accentBg,
    borderColor: C.rule,
    borderWidth: 1,
  });

  let boxY = y - 22;
  drawAt('Offre / Prestation', margin + 20, boxY, 9, true, C.muted);
  boxY -= 20;
  drawAt(data.offer.name, margin + 20, boxY, 14, true, C.accent);
  boxY -= 20;

  for (const line of descLines) {
    drawAt(line, margin + 20, boxY, 10, false, C.muted);
    boxY -= 14;
  }

  if (data.offer.tier) {
    drawAt(`Formule : ${data.offer.tier}`, margin + 20, boxY, 9, false, C.muted);
    boxY -= 14;
  }

  if (data.offer.features?.length) {
    for (const feat of data.offer.features.slice(0, 4)) {
      drawAt(`• ${feat}`, margin + 20, boxY, 9, false, C.muted);
      boxY -= 12;
    }
  }

  y -= boxH + 24;

  const totalH = 44;
  page.drawRectangle({
    x: margin,
    y: y - totalH,
    width: contentW,
    height: totalH,
    color: C.accent,
  });
  drawAt('Total TTC', margin + 20, y - 28, 12, true, C.white);
  const amountW = bold.widthOfTextAtSize(data.amountLabel, 16);
  drawAt(
    data.amountLabel,
    width - margin - 20 - amountW,
    y - 30,
    16,
    true,
    C.white,
  );
  y -= totalH + 28;

  const modeLine =
    data.paymentMode === 'subscription'
      ? 'Paiement par abonnement — SmartQR Digital Events'
      : 'Paiement unique — SmartQR Digital Events';
  drawAt(modeLine, margin, y, 9, false, C.muted);
  y -= 14;
  drawAt(`ID paiement : ${data.paymentId}`, margin, y, 8, false, C.muted);
  y -= 12;
  if (data.stripeSessionId) {
    const sessionLines = wrapText(
      `Session Stripe : ${data.stripeSessionId}`,
      contentW,
      regular,
      8,
    );
    for (const line of sessionLines) {
      drawAt(line, margin, y, 8, false, C.muted);
      y -= 11;
    }
  }

  y -= 8;
  drawAt('Merci pour votre confiance.', margin, y, 10, false, C.muted);
  y -= 14;
  drawAt('contact@smart-qr.pro · smart-qr.pro', margin, y, 9, false, C.muted);

  return Buffer.from(await pdf.save());
}
