import { Test, TestingModule } from '@nestjs/testing';
import { PdfQrController } from './pdf-qr.controller';

describe('PdfQrController', () => {
  let controller: PdfQrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfQrController],
    }).compile();

    controller = module.get<PdfQrController>(PdfQrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
