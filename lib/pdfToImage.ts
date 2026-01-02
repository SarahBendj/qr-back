import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function pdfToImage(pdfPath: string, outputDir: string): Promise<string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = path.parse(pdfPath).name;
  const tempOutput = path.join(outputDir, baseName);
  const finalPath = path.join(outputDir, `${baseName}.png`);

  try {
    // Convertit la première page du PDF en PNG avec pdftoppm (poppler-utils)
    execSync(`pdftoppm -png -singlefile -scale-to 2000 "${pdfPath}" "${tempOutput}"`);
    
    // pdftoppm génère un fichier avec .png à la fin
    const generatedFile = `${tempOutput}.png`;
    
    // Renomme si nécessaire (si le nom généré diffère)
    if (generatedFile !== finalPath && fs.existsSync(generatedFile)) {
      fs.renameSync(generatedFile, finalPath);
    }
    
    return `/uploads/cv/${path.basename(finalPath)}`;
    
  } catch (error) {
    throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}