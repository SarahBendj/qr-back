// src/pdf-qr/pdf-qr.controller.ts
import { Controller, Post, UploadedFiles, UseInterceptors, Body, Res, Param, Put, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PdfQrService } from './pdf-qr.service';
import { Response , Express } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';


@Controller('pdf-qr')
export class PdfQrController {
  constructor(private readonly pdfQrService: PdfQrService) {}

 @UseGuards(JwtAuthGuard)
  @Post('generate-n-merge')
  @UseInterceptors(FilesInterceptor('pdfs'))
    @Throttle({ exp: { limit: 6, ttl: 3600000 * 24 } })
 
  async mergePdf(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('body') bodyJson: string, // bodyJson est une string
    @Res() res: Response,
) {
  const pdfBuffers = files.map((f) => f.buffer);

  // Parse manuellement
  const body = JSON.parse(bodyJson);
  console.log('Parsed body:', body);


    const mergedPdf = await this.pdfQrService.mergePdfsWithQr(pdfBuffers, body.qrText, {
      x: Number(body.x),
      y: Number(body.y),
      size: Number(body.size),
    });
    console.log(mergedPdf);


    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="merged.pdf"`);
    res.send(mergedPdf);


}
  
  @Post(':url')
  async generateQr(@Param() url : string){
   const qr = await this.pdfQrService.generateQr(url)
   return qr

  }
  @UseGuards(JwtAuthGuard)
  @Put('access-code/:url')
  @Throttle({ exp: { limit: 6, ttl: 3600000 * 24 } })
  async generateAccessCode(
  @Param('url') url: string,
  @Body() data: { type: string; code: string }
) {

  return this.pdfQrService.generateAccessCode(url, data.type, data.code);
}




  
}
