import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProfilService {
  private prisma = new PrismaClient();

  async getProfilByUserId(userId: string) {

    const profil = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        role: true,
        subscription: true,
        // isPrivate: true, // si tu ajoutes ce champ
        createdAt: true,
        updatedAt: true,
        candidate: true,
        events: true,
        smartQrs: true,
        model : true,
      }, 
    });
    
    return profil
  }

async deleteMyAccount(userId: string) {
  if (!userId) {
    throw new BadRequestException('User ID is required');
  }


  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });



  if (!user) throw new NotFoundException('User not found');


  await this.prisma.link.deleteMany({
    where: { candidate: { userId } },
  });

  await this.prisma.candidate.deleteMany({
    where: { userId },
  });

  await this.prisma.eventLink.deleteMany({
    where: { event: { userId } },
  });
  await this.prisma.participant.deleteMany({
    where: { event: { userId } },
  });

  await this.prisma.event.deleteMany({
    where: { userId },
  });

  await this.prisma.smartQR.deleteMany({
    where: { userId },
  });
  const portfolio = await this.prisma.portfolio.findUnique({ where : {userId : user.id}})

if (portfolio) {
    await this.prisma.portfolio.delete({
      where: { userId },
    });

  }
  
  const deletedUser = await this.prisma.user.delete({
    where: { id: userId },
  });

 
  return true;
}


}
