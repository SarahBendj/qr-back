// src/pdf-qr/pdf-qr.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { CandidateService } from 'src/candidate/candidate.service';
import { EventService } from 'src/event/event.service';

@Injectable()
export class PdfQrService {
  private prisma = new PrismaClient();
   constructor(
    private readonly  eventService : EventService,
    private readonly  candidateService : CandidateService) {}

  /**
   * Merge multiple PDFs + QR code on the last page
   * @param pdfBuffers Array de Buffers PDF
   * @param qrText Texte/URL du QR code
   * @param options Position et taille du QR (en pourcentage ou absolu)
   */
  async mergePdfsWithQr(
    pdfBuffers: Buffer[],
    qrText: string,
    options: { xPercent?: number; yPercent?: number; sizePercent?: number; x?: number; y?: number; size?: number } = { xPercent: 90, yPercent: 5, sizePercent: 10 },
  ): Promise<Buffer> {
    // 1️⃣ Créer un PDF fusionné
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    // 2️⃣ Vérifier et extraire le slug depuis l’URL
    if (!qrText) throw new Error('qrText is required');
    const slug = qrText.split('/').pop();
    if (!slug) throw new Error('Invalid qrText format: slug not found.');

    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: { links: true },
    });

    if (!candidate) {
      throw new Error(`Candidate with slug "${slug}" not found.`);
    }

    // 3️⃣ Générer le QR code PNG
    const qrPngBuffer = await QRCode.toBuffer(String(qrText), { type: 'png' });
    const pngImage = await mergedPdf.embedPng(qrPngBuffer);

    // 4️⃣ Ajouter le QR sur la dernière page
    const lastPage = mergedPdf.getPage(mergedPdf.getPageCount() - 1);
    const { width: pageWidth, height: pageHeight } = lastPage.getSize();


console.log('Options for QR placement (percent):', options);

// Treat options.x and options.y as percentages (0..100)
const xPercent = options.x ?? 90; // fallback 90%
const yPercent = options.y ?? 5;  // fallback 5%
const size = options.size ?? 100; // in PDF units

// Convert percent to PDF coordinates (PDF origin bottom-left)
let x = (xPercent / 100) * pageWidth;
let y = (yPercent / 100) * pageHeight;
x = x - size / 2;
y = y - size / 2;

lastPage.drawImage(pngImage, { x , y, width: size, height: size });


    // 5️⃣ Retourner le PDF final
    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
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