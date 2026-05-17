import { PDFDocument, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { brandLogoUrl } from './brand';
import type { SalonEventBrand } from './salon-brand';
import { registerPdfFonts } from '../pdf/embed-fonts';
import { wrapText } from '../pdf/text-layout';

export type EventTicketInput = {
  guestName: string;
  eventTitle: string;
  eventSubtitle?: string;
  eventDateTime: string;
  eventLocation?: string;
  category?: string;
  qrUrl: string;
  statusLabel?: string;
  /** Business white-label: sober ticket without SmartQR branding */
  brand?: SalonEventBrand;
};

export function formatEventDateTime(event: {
  date?: Date | null;
  time?: string | null;
  duration?: string | null;
}): string {
  const parts: string[] = [];
  if (event.date) {
    parts.push(
      new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(event.date)),
    );
  }
  if (event.time?.trim()) parts.push(event.time.trim());
  if (event.duration?.trim()) parts.push(`Durée : ${event.duration.trim()}`);
  return parts.join(', ') || 'Date à confirmer';
}

const DEFAULT_C = {
  pageBg: rgb(0.953, 0.941, 0.98),
  card: rgb(1, 1, 1),
  ink: rgb(0.102, 0.039, 0.235),
  muted: rgb(0.294, 0.251, 0.412),
  rule: rgb(0.894, 0.875, 0.941),
  accent: rgb(0.486, 0.227, 0.929),
  accentSoft: rgb(0.929, 0.914, 0.996),
  white: rgb(1, 1, 1),
};

const SALON_C = {
  pageBg: rgb(0.969, 0.965, 0.957),
  card: rgb(1, 1, 1),
  ink: rgb(0.11, 0.106, 0.098),
  muted: rgb(0.42, 0.404, 0.38),
  rule: rgb(0.91, 0.902, 0.886),
  accent: rgb(0.11, 0.106, 0.098),
  accentSoft: rgb(0.98, 0.976, 0.969),
  white: rgb(1, 1, 1),
};

const W = 420;
const H = 595;
const CARD_M = 20;
const PAD = 28;

export async function generateEventTicketPdf(
  input: EventTicketInput,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([W, H]);
  const { regular, bold } = await registerPdfFonts(pdf);
  const isSalon = Boolean(input.brand?.brandName?.trim());
  const C = isSalon ? SALON_C : DEFAULT_C;
  const brandName = input.brand?.brandName?.trim();

  const cardX = CARD_M;
  const cardY = CARD_M;
  const cardW = W - CARD_M * 2;
  const cardH = H - CARD_M * 2;
  const innerW = cardW - PAD * 2;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.pageBg });
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: C.card,
    borderColor: C.rule,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: cardX,
    y: cardY + cardH - 4,
    width: cardW,
    height: 4,
    color: C.accent,
  });

  let y = cardY + cardH - PAD - 4;

  const logoUrl = isSalon
    ? input.brand?.logoUrl?.trim()
    : brandLogoUrl();
  let logoDrawn = false;

  if (logoUrl) {
    try {
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBytes = await logoRes.arrayBuffer();
        const contentType = logoRes.headers.get('content-type') ?? '';
        const logo = contentType.includes('jpeg') || contentType.includes('jpg')
          ? await pdf.embedJpg(logoBytes)
          : await pdf.embedPng(logoBytes);
        const logoW = isSalon ? 64 : 72;
        const logoH = (logo.height / logo.width) * logoW;
        page.drawImage(logo, {
          x: cardX + PAD,
          y: y - logoH,
          width: logoW,
          height: logoH,
        });
        logoDrawn = true;
      }
    } catch {
      logoDrawn = false;
    }
  }

  if (!logoDrawn) {
    const fallback = isSalon ? brandName ?? 'Invitation' : 'SmartQR';
    page.drawText(fallback, {
      x: cardX + PAD,
      y: y - 14,
      size: isSalon ? 10 : 11,
      font: bold,
      color: C.ink,
    });
  }

  if (input.statusLabel?.trim()) {
    const label = input.statusLabel.trim().toUpperCase();
    const size = 7.5;
    const padX = 10;
    const padY = 5;
    const labelW = bold.widthOfTextAtSize(label, size) + padX * 2;
    const chipH = size + padY * 2;
    const chipX = cardX + cardW - PAD - labelW;
    const chipY = y - chipH + 2;
    page.drawRectangle({
      x: chipX,
      y: chipY,
      width: labelW,
      height: chipH,
      color: C.accent,
    });
    page.drawText(label, {
      x: chipX + padX,
      y: chipY + padY,
      size,
      font: bold,
      color: C.white,
    });
  }

  y -= 44;
  page.drawLine({
    start: { x: cardX + PAD, y },
    end: { x: cardX + cardW - PAD, y },
    thickness: 0.75,
    color: C.rule,
  });

  y -= 22;
  page.drawText(isSalon ? 'INVITATION' : 'BILLET D\'ENTRÉE', {
    x: cardX + PAD,
    y,
    size: 8,
    font: bold,
    color: C.muted,
  });

  y -= 26;
  const titleSize = 19;
  const titleLines = wrapText(input.eventTitle, innerW, bold, titleSize).slice(
    0,
    3,
  );
  for (const line of titleLines) {
    page.drawText(line, {
      x: cardX + PAD,
      y,
      size: titleSize,
      font: bold,
      color: C.ink,
    });
    y -= titleSize + 6;
  }

  if (input.eventSubtitle?.trim()) {
    y -= 4;
    const subLines = wrapText(
      input.eventSubtitle.trim(),
      innerW,
      regular,
      11,
    ).slice(0, 2);
    for (const line of subLines) {
      page.drawText(line, {
        x: cardX + PAD,
        y,
        size: 11,
        font: regular,
        color: C.muted,
      });
      y -= 14;
    }
  }

  y -= 8;
  page.drawLine({
    start: { x: cardX + PAD, y },
    end: { x: cardX + cardW - PAD, y },
    thickness: 0.75,
    color: C.rule,
  });

  const qrSize = 118;
  const qrPad = 14;
  const qrBoxH = qrSize + qrPad * 2 + 8;
  const footerH = 36;
  const qrBoxY = cardY + PAD + footerH;
  const contentFloor = qrBoxY + qrBoxH + 14;

  const drawInfoRow = (label: string, value: string) => {
    const rowH = 20 + Math.min(wrapText(value, innerW - 4, bold, 11).length, 2) * 14 + 8;
    if (y - rowH < contentFloor) return;

    y -= 20;
    page.drawText(label.toUpperCase(), {
      x: cardX + PAD,
      y,
      size: 7,
      font: bold,
      color: C.muted,
    });
    const valueLines = wrapText(value, innerW - 4, bold, 11).slice(0, 2);
    let valueY = y - 14;
    for (const line of valueLines) {
      page.drawText(line, {
        x: cardX + PAD,
        y: valueY,
        size: 11,
        font: bold,
        color: C.ink,
      });
      valueY -= 14;
    }
    y = valueY - 6;
  };

  drawInfoRow('Invité', input.guestName);
  drawInfoRow('Date & heure', input.eventDateTime);
  if (input.eventLocation?.trim()) {
    drawInfoRow('Lieu', input.eventLocation.trim());
  }

  const tearY = contentFloor + 4;
  page.drawLine({
    start: { x: cardX + PAD, y: tearY },
    end: { x: cardX + cardW - PAD, y: tearY },
    thickness: 0.5,
    color: C.rule,
    dashArray: [4, 4],
  });

  const qrBoxW = qrSize + qrPad * 2;
  const qrBoxX = cardX + (cardW - qrBoxW) / 2;
  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: qrBoxW,
    height: qrBoxH,
    color: C.accentSoft,
    borderColor: C.rule,
    borderWidth: 1,
  });

  const qrDark = isSalon ? '#1c1b19' : '#1a0a3c';
  const qrBuffer = await QRCode.toBuffer(input.qrUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: qrDark, light: '#ffffff' },
  });
  const qrImage = await pdf.embedPng(qrBuffer);
  const qrX = qrBoxX + qrPad;
  const qrY = qrBoxY + qrPad;
  page.drawRectangle({
    x: qrX - 2,
    y: qrY - 2,
    width: qrSize + 4,
    height: qrSize + 4,
    color: C.white,
  });
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const caption = isSalon
    ? 'Présentez ce code à l\'accueil de l\'événement'
    : 'Présentez ce code à l\'accueil';
  const captionSize = 8.5;
  const captionW = regular.widthOfTextAtSize(caption, captionSize);
  page.drawText(caption, {
    x: (W - captionW) / 2,
    y: qrBoxY - 16,
    size: captionSize,
    font: regular,
    color: C.muted,
  });

  const footer = isSalon
    ? (input.brand?.footerLine?.trim() || brandName || '')
    : 'smart-qr.pro | Digital Events';
  if (footer) {
    const footerSize = 7.5;
    const footerW = regular.widthOfTextAtSize(footer, footerSize);
    page.drawText(footer, {
      x: (W - footerW) / 2,
      y: cardY + 14,
      size: footerSize,
      font: regular,
      color: C.muted,
    });
  }

  return Buffer.from(await pdf.save());
}

export async function qrCodeDataUrl(text: string): Promise<string> {
  const buffer = await QRCode.toBuffer(text, {
    type: 'png',
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#7c3aed', light: '#ffffff' },
  });
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
