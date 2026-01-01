import { Test, TestingModule } from '@nestjs/testing';
import { ProfilService } from './profil.service';

describe('ProfilService', () => {
  let service: ProfilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfilService],
    }).compile();

    service = module.get<ProfilService>(ProfilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
