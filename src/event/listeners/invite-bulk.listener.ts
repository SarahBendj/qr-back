import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { eventConfirmJoinUrl } from 'lib/mail/brand';
import { isInviteEmailException } from '../invite-email-exception';
import {
  INVITE_BULK_EVENT,
  type InviteBulkEventPayload,
} from '../events/invite-bulk.event';

@Injectable()
export class InviteBulkListener {
  private readonly logger = new Logger(InviteBulkListener.name);
  private readonly prisma = new PrismaClient();

  constructor(private readonly mailService: SmartQRUserMailing) {}

  @OnEvent(INVITE_BULK_EVENT, { async: true })
  async handleInviteBulk(payload: InviteBulkEventPayload): Promise<void> {
    const existingEmails = new Set(payload.existingEmails);
    let guestCount = await this.prisma.participant.count({
      where: {
        eventId: payload.eventId,
        role: { not: 'Organizer' },
      },
    });

    const sent: string[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const row of payload.rows) {
      const email = row.email;
      const inviteException = isInviteEmailException(email);

      if (guestCount >= payload.guestLimit) {
        failed.push({ email, reason: 'EVENT_FULL' });
        continue;
      }

      try {
        await this.prisma.participant.create({
          data: {
            eventId: payload.eventId,
            name: row.name,
            email,
            role: 'Referent',
          },
        });
        if (!inviteException) {
          existingEmails.add(email);
        }
        guestCount += 1;

        const confirmUrl = eventConfirmJoinUrl(
          payload.category,
          payload.slug,
          email,
          true,
          payload.salonMark,
        );
        const declineUrl = eventConfirmJoinUrl(
          payload.category,
          payload.slug,
          email,
          false,
          payload.salonMark,
        );

        await this.mailService.confirmEventJoin({
          email,
          name: row.name,
          eventTitle: payload.eventTitle,
          confirmUrl,
          declineUrl,
          eventDateTime: payload.eventDateTime,
          eventLocation: payload.eventLocation,
          category: payload.eventCategory,
          slug: payload.slug,
          salonMark: payload.salonMark,
          accessCode: payload.privateCodeForEmail,
          brand: payload.brand,
        });

        sent.push(email);
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : 'INVITE_SEND_FAILED';
        failed.push({ email, reason });
        this.logger.warn(
          `batch=${payload.batchId} invite failed for ${email}: ${reason}`,
        );
      }
    }

    this.logger.log(
      `batch=${payload.batchId} done sent=${sent.length} failed=${failed.length}`,
    );
  }
}
