import { fromPath } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';

export async function pdfToImage(pdfPath: string, outputDir: string): Promise<string> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const baseName = path.parse(pdfPath).name;
  const outputPath = path.join(outputDir, `${baseName}.png`);

  const options = {
    density: 200,
    saveFilename: baseName,
    savePath: outputDir,
    format: 'png',
    width: 2000,
    height: 2000,
  };

  const convert = fromPath(pdfPath, options);
  const result = await convert(1, { responseType: 'image' });
  console.log(result)

  return `/uploads/cv/${baseName}.1.png`;
}
