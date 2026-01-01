import { Test, TestingModule } from '@nestjs/testing';
import { ProfilController } from './profil.controller';

describe('ProfilController', () => {
  let controller: ProfilController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilController],
    }).compile();

    controller = module.get<ProfilController>(ProfilController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
