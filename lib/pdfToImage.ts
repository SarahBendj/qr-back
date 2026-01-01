import { pdfToPng } from 'pdf-to-png-converter';
import * as fs from 'fs';
import * as path from 'path';

export async function pdfToImage(pdfPath: string, outputDir: string): Promise<string> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const baseName = path.parse(pdfPath).name;

  // Convert PDF -> PNG
  const pngPages = await pdfToPng(pdfPath, {
    viewportScale: 2.0,
    outputFolder: outputDir,
    outputFileMaskFunc: () => `${baseName}.png`,
    pagesToProcess: [1],
    returnPageContent: true, // must be true to get content buffer
    processPagesInParallel: false,
  });

  if (!pngPages || pngPages.length === 0) {
    throw new Error('PDF conversion failed');
  }

  const firstPage = pngPages[0];
  if (!firstPage.content) {
    throw new Error('PDF conversion returned empty content buffer');
  }

  // Chemin final pour le PNG
  const pngPath = path.join(outputDir, `${baseName}.png`);

  fs.writeFileSync(pngPath, firstPage.content);

  
  return `/uploads/cv/${path.basename(pngPath)}`;
}

