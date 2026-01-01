import { Controller, Get, Req, UseGuards, NotFoundException, Delete } from '@nestjs/common';
import { ProfilService } from './profil.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('profil')
export class ProfilController {
  constructor(private readonly profilService: ProfilService) {}

 

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfilByUserId(@Req() req) {

    const userId = req.user?.id;
    if (!userId) throw new NotFoundException('User not found');

    const profil = await this.profilService.getProfilByUserId(userId);

    if (!profil) throw new NotFoundException('Profil not found');

    return profil;
  }


  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteAccount(@Req() req){
     const userId = req.user?.id;
    if (!userId) throw new NotFoundException('User not found');
     await this.profilService.deleteMyAccount(userId);

    return true;

  }

}
