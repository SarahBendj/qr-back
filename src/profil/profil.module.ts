import { Module } from '@nestjs/common';
import { ProfilService } from './profil.service';
import { ProfilController } from './profil.controller';

@Module({
  providers: [ProfilService],
  controllers: [ProfilController],
  exports: [ProfilService], 
})
export class ProfilModule {}
