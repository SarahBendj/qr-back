import { BadRequestException, CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class PaymentSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    const session = await this.prisma.paymentSession.findFirst({
      where: {
        payment: { userId },
        used: false,
        status: 'requires_payment_method',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('INVALID_SESSION');
    }

    request.openSession = session;
    return true;
  }
}

