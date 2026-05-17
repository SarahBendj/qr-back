import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';

function resolveFontsDir(): string {
  const candidates = [
    join(__dirname, 'fonts'),
    join(__dirname, 'pdf', 'fonts'),
    join(process.cwd(), 'lib', 'pdf', 'fonts'),
    join(process.cwd(), 'dist', 'lib', 'pdf', 'fonts'),
    join(process.cwd(), 'dist', 'lib', 'pdf', 'pdf', 'fonts'),
  ];
  const dir = candidates.find((d) =>
    existsSync(join(d, 'NotoSans-Regular.ttf')),
  );
  if (!dir) {
    throw new Error('PDF fonts not found (NotoSans-Regular.ttf)');
  }
  return dir;
}

export type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

export async function registerPdfFonts(pdf: PDFDocument): Promise<PdfFonts> {
  pdf.registerFontkit(fontkit);

  const fontsDir = resolveFontsDir();
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(join(fontsDir, 'NotoSans-Regular.ttf')),
    readFile(join(fontsDir, 'NotoSans-Bold.ttf')),
  ]);

  const [regular, bold] = await Promise.all([
    pdf.embedFont(regularBytes),
    pdf.embedFont(boldBytes),
  ]);

  return { regular, bold };
}
