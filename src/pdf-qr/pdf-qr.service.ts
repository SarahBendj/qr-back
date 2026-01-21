// src/pdf-qr/pdf-qr.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { CandidateService } from 'src/candidate/candidate.service';
import { EventService } from 'src/event/event.service';

interface QrPlacementOptions {
  x?: number;
  y?: number;
  size?: number;
  xPercent?: number;
  yPercent?: number;
  sizePercent?: number;
}

interface QrPosition {
  x: number;
  y: number;
  size: number;
}

@Injectable()
export class PdfQrService {
  private prisma = new PrismaClient();

  constructor(
    private readonly eventService: EventService,
    private readonly candidateService: CandidateService,
  ) {}

  /**
   * Merge multiple PDFs and add a QR code on the last page
   * @param pdfBuffers Array of PDF buffers to merge
   * @param qrText Text/URL for the QR code
   * @param options Position and size options (percentage or absolute)
   * @returns Merged PDF with QR code as Buffer
   */
  async mergePdfsWithQr(
    pdfBuffers: Buffer[],
    qrText: string,
    options: QrPlacementOptions = {},
  ): Promise<Buffer> {
    try {
    
      this.validateInputs(pdfBuffers, qrText);
    
      const mergedPdf = await this.mergePdfBuffers(pdfBuffers);
     
      await this.validateCandidate(qrText);
      
      const qrPngBuffer = await this.generateQrCode(qrText);
     
      const pngImage = await mergedPdf.embedPng(qrPngBuffer);
    
      this.addQrToLastPage(mergedPdf, pngImage, options);
    
      const pdfBytes = await mergedPdf.save();
  

      return Buffer.from(pdfBytes);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Validate input parameters
   */
  private validateInputs(pdfBuffers: Buffer[], qrText: string): void {
    if (!pdfBuffers || pdfBuffers.length === 0) {
      throw new BadRequestException('At least one PDF buffer is required');
    }

    if (!qrText || qrText.trim() === '') {
      throw new BadRequestException('QR text is required');
    }
  }

  /**
   * Merge multiple PDF buffers into one document
   */
  private async mergePdfBuffers(pdfBuffers: Buffer[]): Promise<PDFDocument> {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      try {
        const pdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        throw new BadRequestException(`Failed to load PDF: ${error.message}`);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      throw new BadRequestException('No pages found in provided PDFs');
    }

    return mergedPdf;
  }

  /**
   * Extract slug from URL and validate candidate exists
   */
  private async validateCandidate(qrText: string): Promise<void> {
    const slug = this.extractSlug(qrText);

    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with slug "${slug}" not found`);
    }
  }

  /**
   * Extract slug from URL
   */
  private extractSlug(qrText: string): string {
    const slug = qrText.split('/').pop();

    if (!slug || slug.trim() === '') {
      throw new BadRequestException('Invalid QR text format: slug not found');
    }

    return slug;
  }

  /**
   * Generate QR code as PNG buffer
   */
  private async generateQrCode(text: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(text, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
      });
    } catch (error) {
      throw new BadRequestException(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Add QR code image to the last page of the PDF
   */
  private addQrToLastPage(
    pdfDoc: PDFDocument,
    qrImage: any,
    options: QrPlacementOptions,
  ): void {
    const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    const { width: pageWidth, height: pageHeight } = lastPage.getSize();

    const position = this.calculateQrPosition(pageWidth, pageHeight, options);



    lastPage.drawImage(qrImage, {
      x: position.x,
      y: position.y,
      width: position.size,
      height: position.size,
    });
  }

  /**
   * Calculate QR position based on options
   * x, y are percentages (0-100) representing position from left and bottom
   * size is in PDF points (absolute units)
   */
  private calculateQrPosition(
    pageWidth: number,
    pageHeight: number,
    options: QrPlacementOptions,
  ): QrPosition {
    // Default values
    const defaults = {
      xPercent: 90,
      yPercent: 5,
      size: 100,
    };

    const size = options.size ?? defaults.size;

    const xPercent = options.x ?? options.xPercent ?? defaults.xPercent;
    let x = (xPercent / 100) * pageWidth;


    const yPercent = options.y ?? options.yPercent ?? defaults.yPercent;
 
    let y = (yPercent / 100) * pageHeight; 


    x = x - size / 2;
    y = y - size / 2;

    // Ensure QR code stays within page bounds
    x = Math.max(0, Math.min(x, pageWidth - size));
    y = Math.max(0, Math.min(y, pageHeight - size));

    return { x, y, size };
  }

  /**
   * Cleanup Prisma connection (call in onModuleDestroy)
   */
  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  

 async generateQr(url: string) {
    if (!url) {
      throw new NotFoundException('URL is required to generate QR code');
    }

    // Génère le QR code en buffer PNG
    const qrBuffer = await QRCode.toBuffer(url, { type: 'png' });

    return {
      qrCode: qrBuffer.toString('base64'), 
      qrUrl: url,
    };

    
}

async generateAccessCode(url: string, type: string, code: string) {
  // -----------------------------
  // 1. INPUT VALIDATION
  // -----------------------------
  if (!url || !type || !code) {
    throw new BadRequestException("url, type and code are required");
  }

  const normalizedType = type.toLowerCase().trim();


  if (normalizedType === "event") {
    return this.eventService.updateEventAccessCode(url, code);
  } 

  if (normalizedType === "candidate") {
    return this.candidateService.updateCandidateAccessCode(url, code);
  }

  throw new BadRequestException(`Unknown type '${type}'`);
}

}