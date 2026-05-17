import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import {
  buildInvoiceReference,
  formatInvoiceDate,
  formatMoney,
  generatePaymentInvoicePdf,
} from 'lib/invoice/payment-invoice.pdf';
import type {
  PaymentInvoiceData,
  PaymentInvoiceResponse,
} from 'lib/invoice/payment-invoice.types';

@Injectable()
export class PaymentInvoiceService {
  private readonly logger = new Logger(PaymentInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: SmartQRUserMailing,
  ) {}

  async buildInvoiceData(paymentId: string): Promise<PaymentInvoiceData | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        sessions: {
          orderBy: { paidAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!payment || payment.status !== 'succeeded') {
      return null;
    }

    const issuedAt =
      payment.sessions[0]?.paidAt ?? payment.updatedAt ?? new Date();
    const reference = buildInvoiceReference(payment.id, issuedAt);
    const offer = await this.resolveOffer(payment.productId);
    const paymentMode: PaymentInvoiceData['paymentMode'] =
      payment.stripeSubscriptionId ? 'subscription' : 'one_time';

    return {
      reference,
      issuedAt: issuedAt.toISOString(),
      issuedAtLabel: formatInvoiceDate(issuedAt),
      offer,
      amountCents: payment.amount,
      amountLabel: formatMoney(payment.amount, payment.currency),
      currency: payment.currency.toUpperCase(),
      customerName: payment.user.name ?? payment.user.email,
      customerEmail: payment.user.email,
      paymentId: payment.id,
      stripeSessionId: payment.sessions[0]?.stripeSessionId ?? null,
      paymentMode,
    };
  }

  async issueForPayment(
    paymentId: string,
    options?: { sendEmail?: boolean; includePdfBase64?: boolean },
  ): Promise<PaymentInvoiceResponse | null> {
    const data = await this.buildInvoiceData(paymentId);
    if (!data) {
      return null;
    }

    let pdfBase64: string | undefined;
    if (options?.includePdfBase64) {
      const pdf = await generatePaymentInvoicePdf(data);
      pdfBase64 = pdf.toString('base64');
    }

    if (options?.sendEmail !== false) {
      try {
        const pdf = await generatePaymentInvoicePdf(data);
        await this.mailService.sendPaymentInvoiceEmail(data, pdf);
      } catch (err) {
        this.logger.warn(
          `Invoice email failed for payment ${paymentId}`,
          err,
        );
      }
    }

    return { ...data, pdfBase64 };
  }

  async getInvoicePdfForUser(
    paymentId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; data: PaymentInvoiceData }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Invoice not found');
    }
    if (payment.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }

    const data = await this.buildInvoiceData(paymentId);
    if (!data) {
      throw new BadRequestException('Invoice unavailable');
    }

    const buffer = await generatePaymentInvoicePdf(data);
    const filename = `${data.reference}.pdf`;
    return { buffer, filename, data };
  }

  async getInvoiceByCheckoutSession(
    checkoutSessionId: string,
    userId: string,
    includePdfBase64 = false,
  ): Promise<PaymentInvoiceResponse | null> {
    const session = await this.prisma.paymentSession.findUnique({
      where: { stripeSessionId: checkoutSessionId },
      include: { payment: true },
    });
    if (!session?.payment || session.payment.userId !== userId) {
      throw new NotFoundException('Payment session not found');
    }
    return this.issueForPayment(session.paymentId, {
      sendEmail: false,
      includePdfBase64: includePdfBase64,
    });
  }

  private async resolveOffer(productId: string) {
    const planMatch = productId.match(/^plan_([^_]+)_/);
    if (planMatch) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: planMatch[1] },
      });
      if (plan) {
        return {
          name: plan.name,
          description: plan.description,
          features: plan.features ?? [],
          tier: plan.tier,
        };
      }
    }

    const eventMatch = productId.match(/^event_(.+)$/);
    if (eventMatch) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventMatch[1] },
      });
      if (event) {
        return {
          name: event.title,
          description: event.description ?? 'Accès événement SmartQR',
          features: event.tags?.length ? event.tags : undefined,
          tier: event.category,
        };
      }
    }

    return {
      name: 'Prestation SmartQR',
      description: productId,
      features: [],
      tier: null,
    };
  }
}
