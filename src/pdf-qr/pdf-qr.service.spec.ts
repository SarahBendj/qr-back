import { Test, TestingModule } from '@nestjs/testing';
import { PdfQrService } from './pdf-qr.service';

describe('PdfQrService', () => {
  let service: PdfQrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfQrService],
    }).compile();

    service = module.get<PdfQrService>(PdfQrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
