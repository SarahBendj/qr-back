import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Resend } from 'resend';
import type { CreateEmailOptions } from 'resend';
import { welcomeTemplate } from './templates/welcome.template';
import { joinEvent } from './templates/joinEvent.template';
import { salonInviteEmail } from './templates/salonInvite.template';
import {
  fetchInlineLogoAttachment,
  type SalonEventBrand,
} from './salon-brand';
import { eventTicketConfirmed } from './templates/eventTicketConfirmed.template';
import { confirmOrRevokeMissionProposal } from './templates/confrimOrRevokeMissionPorposal';
import { walletActivationTemplate } from './templates/walletActivation.template';
import { accountDeletedTemplate } from './templates/accountDeleted.template';
import { contactInquiryTemplate } from './templates/contactInquiry.template';
import {
  generateEventTicketPdf,
  qrCodeDataUrl,
  type EventTicketInput,
} from './event-ticket.pdf';
import { eventPublicUrl } from './brand';
import { eventAccessCodeTemplate } from './templates/eventAccessCode.template';
import { paymentInvoiceTemplate } from './templates/paymentInvoice.template';
import type { PaymentInvoiceData } from '../invoice/payment-invoice.types';

export type EventJoinMailPayload = {
  email: string;
  name: string;
  eventTitle: string;
  confirmUrl: string;
  declineUrl: string;
  eventDateTime?: string;
  eventLocation?: string;
  category?: string;
  slug: string;
  salonMark?: string | null;
  accessCode?: string;
  /** Business plan white-label invitation */
  brand?: SalonEventBrand | null;
};

export type EventTicketMailPayload = {
  email: string;
  name: string;
  eventTitle: string;
  eventDateTime?: string;
  eventLocation?: string;
  category?: string;
  slug: string;
  statusLabel?: string;
  salonMark?: string | null;
};

export type EventAccessCodeMailPayload = {
  email: string;
  name: string;
  eventTitle: string;
  accessCode: string;
  category: string;
  slug: string;
  salonMark?: string | null;
};

@Injectable()
export class SmartQRUserMailing {
  private readonly resend: Resend;
  private readonly logger = new Logger(SmartQRUserMailing.name);

  constructor() {
    const apiKey = process.env.API_KEY_MAIL;
    if (!apiKey?.trim()) {
      this.logger.error('API_KEY_MAIL is missing — emails will not be sent');
    }
    this.resend = new Resend(apiKey);
  }

  private mailFrom(label = 'SmartQR'): string {
    const addr =
      process.env.EMAIL_SENDER?.trim() || 'onboarding@resend.dev';
    return `${label} <${addr}>`;
  }

  private contactInbox(): string {
    return (
      process.env.CONTACT_INBOX?.trim() ||
      process.env.MAIL_XP1?.trim() ||
      'contact@smart-qr.pro'
    );
  }

  private async sendMail(
    payload: CreateEmailOptions,
    context: string,
  ): Promise<void> {
    if (!process.env.API_KEY_MAIL?.trim()) {
      throw new ServiceUnavailableException(
        'Mail service is not configured (API_KEY_MAIL)',
      );
    }

    const { data, error } = await this.resend.emails.send(payload);

    if (error) {
      this.logger.error(
        `${context} failed: ${error.message}`,
        JSON.stringify(error),
      );
      throw new BadGatewayException(
        `Email could not be sent: ${error.message}`,
      );
    }

    this.logger.log(`${context} sent (id=${data?.id ?? 'n/a'})`);
  }

  private async buildTicketPdf(
    payload: EventTicketMailPayload & { brand?: SalonEventBrand | null },
  ): Promise<Buffer> {
    const category = payload.category ?? 'event';
    const qrUrl = eventPublicUrl(category, payload.slug, payload.salonMark);
    const ticketInput: EventTicketInput = {
      guestName: payload.name,
      eventTitle: payload.eventTitle,
      eventDateTime: payload.eventDateTime ?? 'Date à confirmer',
      eventLocation: payload.eventLocation,
      category: payload.category,
      qrUrl,
      statusLabel: payload.statusLabel,
      brand: payload.brand ?? undefined,
    };
    return generateEventTicketPdf(ticketInput);
  }

  private ticketFilename(eventTitle: string, brand?: SalonEventBrand | null): string {
    const safe = eventTitle
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40);
    if (brand?.brandName?.trim()) {
      return `invitation-${safe || 'evenement'}.pdf`;
    }
    return `billet-smartqr-${safe || 'event'}.pdf`;
  }

  async sendWelcomeToClient(email: string, name: string): Promise<void> {
    await this.sendMail(
      {
        from: this.mailFrom(),
        to: email,
        subject: 'Welcome to SmartQR',
        html: welcomeTemplate(name),
      },
      `Welcome email to ${email}`,
    );
  }

  async confirmEventJoin(payload: EventJoinMailPayload): Promise<void> {
    const category = payload.category ?? 'event';
    const brand = payload.brand?.brandName?.trim() ? payload.brand : null;
    const qrUrl = eventPublicUrl(category, payload.slug, payload.salonMark);
    const pdfBuffer = await this.buildTicketPdf({
      ...payload,
      statusLabel: brand ? undefined : 'En attente',
      brand,
    });

    const fromLabel = brand?.brandName ?? 'SmartQR-EVENT';
    const subject = brand
      ? `Invitation : ${payload.eventTitle}`
      : `Inscription : ${payload.eventTitle}`;

    const logoInline = brand?.logoUrl
      ? await fetchInlineLogoAttachment(brand.logoUrl)
      : null;

    const html = brand
      ? salonInviteEmail({
          name: payload.name,
          eventTitle: payload.eventTitle,
          confirmUrl: payload.confirmUrl,
          declineUrl: payload.declineUrl,
          eventDateTime: payload.eventDateTime,
          eventLocation: payload.eventLocation,
          accessCode: payload.accessCode,
          brand,
          logoCid: logoInline?.contentId,
        })
      : joinEvent({
          name: payload.name,
          eventTitle: payload.eventTitle,
          confirmUrl: payload.confirmUrl,
          declineUrl: payload.declineUrl,
          eventDateTime: payload.eventDateTime,
          eventLocation: payload.eventLocation,
          category: payload.category,
          qrImageSrc: await qrCodeDataUrl(qrUrl),
          accessCode: payload.accessCode,
        });

    await this.sendMail(
      {
        from: this.mailFrom(fromLabel),
        to: payload.email,
        subject,
        html,
        attachments: [
          {
            filename: this.ticketFilename(payload.eventTitle, brand),
            content: pdfBuffer,
          },
          ...(logoInline
            ? [
                {
                  filename: logoInline.filename,
                  content: logoInline.content,
                  contentType: logoInline.contentType,
                  contentId: logoInline.contentId,
                },
              ]
            : []),
        ],
      },
      `Event join email to ${payload.email}`,
    );
  }

  async sendEventAccessCode(payload: EventAccessCodeMailPayload): Promise<void> {
    const eventUrl = eventPublicUrl(payload.category, payload.slug, payload.salonMark);

    await this.sendMail(
      {
        from: this.mailFrom('SmartQR-EVENT'),
        to: payload.email,
        subject: `Événement privé : ${payload.eventTitle}`,
        html: eventAccessCodeTemplate({
          name: payload.name,
          eventTitle: payload.eventTitle,
          accessCode: payload.accessCode,
          eventUrl,
          category: payload.category,
        }),
      },
      `Event access code email to ${payload.email}`,
    );
  }

  async sendEventTicketConfirmed(
    payload: EventTicketMailPayload,
  ): Promise<void> {
    const category = payload.category ?? 'event';
    const eventUrl = eventPublicUrl(category, payload.slug, payload.salonMark);
    const qrImageSrc = await qrCodeDataUrl(eventUrl);
    const pdfBuffer = await this.buildTicketPdf({
      ...payload,
      statusLabel: 'Confirmé',
    });

    await this.sendMail(
      {
        from: this.mailFrom('SmartQR-EVENT'),
        to: payload.email,
        subject: `Billet confirmé : ${payload.eventTitle}`,
        html: eventTicketConfirmed({
          name: payload.name,
          eventTitle: payload.eventTitle,
          eventDateTime: payload.eventDateTime,
          eventLocation: payload.eventLocation,
          category: payload.category,
          eventUrl,
          qrImageSrc,
        }),
        attachments: [
          {
            filename: this.ticketFilename(payload.eventTitle),
            content: pdfBuffer,
          },
        ],
      },
      `Event ticket confirmed to ${payload.email}`,
    );
  }

  async confirmMissionProposal(
    email: string,
    recruiterName: string,
    position: string,
    companyName: string,
    cancelUrl?: string,
  ): Promise<void> {
    await this.sendMail(
      {
        from: this.mailFrom('SmartQR-MISSION'),
        to: email,
        subject: `Mission proposal received: ${position} at ${companyName}`,
        html: confirmOrRevokeMissionProposal(
          recruiterName,
          position,
          companyName,
          cancelUrl,
        ),
      },
      `Mission proposal email to ${email}`,
    );
  }

  async sendAccountDeletedEmail(email: string, name: string): Promise<void> {
    await this.sendMail(
      {
        from: this.mailFrom(),
        to: email,
        subject: 'Your SmartQR account has been deleted',
        html: accountDeletedTemplate(name),
      },
      `Account deletion email to ${email}`,
    );
  }

  async sendContactInquiry(
    senderEmail: string,
    topic: string,
    message: string,
  ): Promise<void> {
    const inbox = this.contactInbox();
    await this.sendMail(
      {
        from: this.mailFrom(),
        to: inbox,
        replyTo: senderEmail,
        subject: `[Contact] ${topic}`,
        html: contactInquiryTemplate(senderEmail, topic, message),
      },
      `Contact inquiry to ${inbox} (from ${senderEmail})`,
    );
  }

  async sendPaymentInvoiceEmail(
    invoice: PaymentInvoiceData,
    pdf: Buffer,
  ): Promise<void> {
    const safeRef = invoice.reference.replace(/[^\w-]/g, '').slice(0, 40);
    await this.sendMail(
      {
        from: this.mailFrom('SmartQR'),
        to: invoice.customerEmail,
        subject: `Facture ${invoice.reference}`,
        html: paymentInvoiceTemplate(invoice),
        attachments: [
          {
            filename: `facture-${safeRef || 'paiement'}.pdf`,
            content: pdf,
          },
        ],
      },
      `Payment invoice email to ${invoice.customerEmail}`,
    );
  }

  async sendWalletActivationEmail(
    email: string,
    name: string,
    applePassUrl: string,
    googleSaveUrl: string,
    profileUrl: string,
  ): Promise<void> {
    await this.sendMail(
      {
        from: this.mailFrom(),
        to: email,
        subject: 'Activez votre carte SmartQR (Wallet)',
        html: walletActivationTemplate(
          name,
          applePassUrl,
          googleSaveUrl,
          profileUrl,
        ),
      },
      `Wallet activation email to ${email}`,
    );
  }
}
