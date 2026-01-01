declare module 'pdf-to-png-converter' {
  export interface PdfToPngOptions {
    disableFontFace?: boolean;
    useSystemFonts?: boolean;
    viewportScale?: number;
    returnPageContent?: boolean;
    pagesToProcess?: number[];
    processPagesInParallel?: boolean;
    outputFolder?: string;
    outputFileMaskFunc?: (pageNumber: number) => string;
  }

  export interface PdfToPngResult {
    pageNumber: number;
    content: Buffer;
  }

  export function pdfToPng(
    pdf: Buffer | string,
    options?: PdfToPngOptions
  ): Promise<PdfToPngResult[]>;
}
