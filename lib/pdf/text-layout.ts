import type { PDFFont } from 'pdf-lib';

export function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export function drawWrappedLines(
  drawLine: (text: string, y: number, bold?: boolean) => void,
  lines: string[],
  startY: number,
  lineHeight: number,
): number {
  let y = startY;
  for (const line of lines) {
    drawLine(line, y, false);
    y -= lineHeight;
  }
  return y;
}
