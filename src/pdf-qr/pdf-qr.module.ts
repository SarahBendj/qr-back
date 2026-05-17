import { Module } from '@nestjs/common';
import { PdfQrController } from './pdf-qr.controller';
import { PdfQrService } from './pdf-qr.service';
import { EventModule } from '../event/event.module';

@Module({
  imports: [EventModule],
  controllers: [PdfQrController],
  providers: [PdfQrService],
})
export class PdfQrModule {}
