import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';
import { mapProfilResponse } from './profil.mapper';

@Injectable()
export class ProfilService {
  private readonly logger = new Logger(ProfilService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: SmartQRUserMailing,
    private readonly stripeService: StripeService,
  ) {}

  async getProfilByUserId(userId: string) {
    await this.stripeService.ensureDefaultFreePlan(userId);

    const [user, planStatus] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          picture: true,
          role: true,
          plan: true,
          createdAt: true,
          updatedAt: true,
          events: {
            orderBy: { createdAt: 'desc' },
            include: {
              participants: { select: { role: true } },
            },
          },
          smartQrs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.stripeService.getPlanStatus(userId),
    ]);

    if (!user) {
      return null;
    }

    return mapProfilResponse(user, planStatus);
  }

  async deleteMyAccount(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    try {
      await this.mailService.sendAccountDeletedEmail(
        user.email,
        user.name ?? 'there',
      );
    } catch (error) {
      this.logger.warn(
        `Account deletion email failed for ${user.email}, proceeding with deletion`,
        error,
      );
    }

    await this.prisma.eventLink.deleteMany({
      where: { event: { userId } },
    });
    await this.prisma.participant.deleteMany({
      where: { event: { userId } },
    });
    await this.prisma.instruction.deleteMany({
      where: { event: { userId } },
    });
    await this.prisma.event.deleteMany({
      where: { userId },
    });
    await this.prisma.smartQR.deleteMany({
      where: { userId },
    });
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    await this.prisma.paymentSession.deleteMany({
      where: { payment: { userId } },
    });
    await this.prisma.payment.deleteMany({
      where: { userId },
    });

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return true;
  }
}
