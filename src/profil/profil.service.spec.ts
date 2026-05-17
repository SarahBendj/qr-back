import { Test, TestingModule } from '@nestjs/testing';
import { ProfilService } from './profil.service';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';

describe('ProfilService', () => {
  let service: ProfilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        {
          provide: SmartQRUserMailing,
          useValue: { sendAccountDeletedEmail: jest.fn() },
        },
        {
          provide: StripeService,
          useValue: { getPlanDetails: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ProfilService>(ProfilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
