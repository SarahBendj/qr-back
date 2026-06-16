import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PlanTier, Prisma } from '@prisma/client';
import { CreateEventDto, JoinEventDTO } from './dto/event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hash, randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as QRCode from 'qrcode';
import { hashing } from 'lib/hashing';
import { R2Service } from 'src/r2/r2.service';

import { SmartQRUserMailing } from 'lib/mail/send.mail';
import { formatEventDateTime } from 'lib/mail/event-ticket.pdf';
import {
  r2PublicAssetUrl,
  type SalonEventBrand,
} from 'lib/mail/salon-brand';
import { eventConfirmJoinUrl, eventPublicUrl, frontendBaseUrl } from 'lib/mail/brand';
import { buildSalonEventAbsoluteUrl } from 'src/salon/salon-event-url';
import { assertUserHasPaidPlan } from 'src/common/plan-access';
import { StripeService } from 'src/stripe/stripe.service';
import { assertBusinessPlan } from './event-entitlement';
import { parseInviteCsv } from './parse-invite-csv';
import { isInviteEmailException } from './invite-email-exception';
import { findEventByCategoryAndSlug, normalizeEventCategory } from './event-lookup';
import { Express } from 'express';
import {
  countEventGuests,
  MAX_GUESTS_PER_EVENT,
  resolveGuestLimit,
  validateAndStringifyCapacity,
} from './event.constants';
import {
  INVITE_BULK_EVENT,
  type InviteBulkEventPayload,
} from './events/invite-bulk.event';



@Injectable()
export class EventService {
  private prisma = new PrismaClient();
  constructor(
    private readonly r2Service: R2Service,
    private readonly mailService: SmartQRUserMailing,
    private readonly eventEmitter: EventEmitter2,
    private readonly stripeService: StripeService,
  ) {}

  private parseJsonArray<T>(value: unknown): T[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private normalizeParticipants(
    raw: unknown,
    user: { name: string | null; email: string },
  ): { name: string; role: string }[] {
    const list = this.parseJsonArray<Record<string, unknown>>(raw);
    const fallbackName =
      user.name?.trim() || user.email?.trim() || 'Organizer';

    const normalized = list
      .map((p, index) => {
        const roleRaw = String(p?.role ?? p?.Role ?? '')
          .trim()
          .toLowerCase();
        const role =
          roleRaw === 'organizer'
            ? 'Organizer'
            : roleRaw === 'referent'
              ? 'Referent'
              : index === 0
                ? 'Organizer'
                : 'Referent';
        const name =
          String(p?.name ?? p?.Name ?? '').trim() ||
          (role === 'Organizer' ? fallbackName : '');
        if (!name) {
          return null;
        }
        return { name, role };
      })
      .filter(
        (p): p is { name: string; role: string } => p !== null,
      );

    if (normalized.length === 0) {
      return [{ name: fallbackName, role: 'Organizer' }];
    }

    return normalized.map((p) =>
      p.role === 'Organizer' && !p.name.trim()
        ? { ...p, name: fallbackName }
        : p,
    );
  }

  private normalizeInstructions(
    raw: unknown,
  ): { rule: string }[] {
    return this.parseJsonArray<Record<string, unknown>>(raw)
      .map((i) => ({
        rule: String(i?.rule ?? i?.Rule ?? '').trim(),
      }))
      .filter((i) => i.rule.length > 0);
  }


  async createEvent(userId: string, dto: CreateEventDto, file?: Express.Multer.File) {
    let accessCode;

    await this.stripeService.ensureDefaultFreePlan(userId);
    await assertUserHasPaidPlan(this.stripeService, userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('USER_NOT_FOUND');
    }

    if (!user.plan) {
      throw new ForbiddenException('REDIRECT_TO_PLAN');
    }

    const plan = await this.prisma.plan.findUnique({ where: { tier: user.plan } });
    if (!plan) {
      throw new ForbiddenException('REDIRECT_TO_PLAN');
    }

    const eventCount = await this.prisma.event.count({ where: { userId } });
    const maxEvents = user.maxEventsOverride ?? plan.maxEvents ?? 1;
    if (eventCount >= maxEvents) {
      throw new ForbiddenException('MAX_REACHED_EVENT_3');
    }

    const slug = randomUUID().slice(0, 18);
    const category = dto.category || 'event';


    // -------------------- Parse Links --------------------
    let links: any[] = [];
    if (dto.links) {
      try {
        links = typeof dto.links === 'string' ? JSON.parse(dto.links) : dto.links;
      } catch (e) {
        throw new BadRequestException('INVALID_JSON_LINKS');
      }
    }

    const participants = this.normalizeParticipants(dto.participants, user);
    const instructions = this.normalizeInstructions(dto.instructions);
   let isPrivate = dto.isPrivate?.toString() === "true";

    if (isPrivate) {
      accessCode = await hashing();

    }else {
      accessCode = null;
    }

    // -------------------- Handle Event Image --------------------
     let imageUrl: string | undefined | null = dto.eventImage;
        if (file) {
          imageUrl = await this.r2Service.uploadFile(file ,"event")
         
        }

   const tagsArray: string[] = Array.isArray(dto.tags)
  ? dto.tags
  : typeof dto.tags === 'string'
    ? (dto.tags as string).split(',').map(t => t.trim()).filter(Boolean)
    : [];

    // -------------------- Create Event --------------------
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        category: category,
        capacity:
          dto.capacity !== undefined
            ? validateAndStringifyCapacity(dto.capacity)
            : null,
        price: dto.price !== undefined ? (dto.price == null ? null : String(dto.price)) : null,
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        duration: dto.duration ?? null,
        contact: dto.contact,
        user : { connect : { id : userId} },
        isPrivate: isPrivate,
        isPrivatePaid:
          Number(dto.price) > 0 ||
          String((dto as { isPrivatePaid?: unknown }).isPrivatePaid ?? '')
            .toLowerCase() === 'true',
        eventImage: imageUrl,
        mapUrl: dto.mapUrl ?? null,
        accessCode : accessCode?.hashed ?? null,
        slug,
        tags :tagsArray,
        links: {
          create: links
            .filter((l: { title?: string; url?: string }) =>
              Boolean(l.title?.trim() || l.url?.trim()),
            )
            .map((l: { title?: string; url?: string }) => ({
              title: l.title?.trim() || 'No Title',
              url: l.url?.trim() ?? '',
            })),
        },
        participants: {
          create: participants.map((p) => ({
            name: p.name,
            role: p.role,
            confirmed: true,
          })),
        },
        instructions: {
          create: instructions.map((i) => ({ rule: i.rule })),
        },
      },
      include: {
        links: true,
        participants: true,
        instructions: true,
        user: { select: { email: true, name: true } },
      },
    });
  

 
    // -------------------- Generate QR Code --------------------
    const salonMark = await this.salonMarkForUser(userId);
    const qrUrl = salonMark
      ? buildSalonEventAbsoluteUrl(salonMark, dto.category, slug)
      : eventPublicUrl(dto.category, slug);
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      margin: 1,
      width: 350,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const qrCodeDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
  

    if (isPrivate && accessCode?.plain) {
      await this.notifyOrganizerAccessCode(event, accessCode.plain);
    }

    return {
      ...event,
      qrUrl,
      code : accessCode?.plain ,
      qrCode: qrCodeDataUrl,
    };
  }

  private async notifyOrganizerAccessCode(
    event: {
      title: string;
      category: string | null;
      slug: string;
      user?: { email: string; name: string | null } | null;
    },
    plainCode: string,
  ): Promise<void> {
    const email = event.user?.email;
    if (!email?.trim()) return;

    await this.mailService.sendEventAccessCode({
      email,
      name: event.user?.name?.trim() || 'Organisateur',
      eventTitle: event.title,
      accessCode: plainCode,
      category: event.category ?? 'event',
      slug: event.slug,
    });
  }

  private async verifyPrivateEventAccess(
    event: { isPrivate: boolean; accessCode: string | null },
    plainAccessCode?: string,
  ): Promise<void> {
    if (!event.isPrivate) {
      return;
    }
    const code = plainAccessCode?.trim();
    if (!code) {
      throw new BadRequestException('ACCESS_CODE_REQUIRED');
    }
    if (!event.accessCode) {
      throw new BadRequestException('EVENT_HAS_NO_ACCESS_CODE');
    }
    const valid = await bcrypt.compare(code, event.accessCode);
    if (!valid) {
      throw new UnauthorizedException('INVALID_ACCESS_CODE');
    }
  }

  private async salonMarkForUser(userId: string): Promise<string | null> {
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
      select: { mark: true },
    });
    return salon?.mark ?? null;
  }

  /** Business plan: white-label name/logo for invitation emails & PDF */
  private async salonBrandForUser(
    userId: string,
  ): Promise<SalonEventBrand | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        email: true,
        salonProfile: {
          select: {
            mark: true,
            displayName: true,
            referenceName: true,
            logoKey: true,
            contactEmails: true,
            footerWebsite: true,
          },
        },
      },
    });
    if (!user || user.plan !== PlanTier.BUSINESS) return null;

    const salon = user.salonProfile;
    if (!salon) return null;

    const brandName =
      salon.displayName?.trim() ||
      salon.referenceName?.trim() ||
      salon.mark;

    const contactEmail =
      salon.contactEmails[0]?.trim() || user.email?.trim() || undefined;

    const website = salon.footerWebsite?.trim();
    const footerLine = website
      ? website.replace(/^https?:\/\//i, '').replace(/\/$/, '')
      : undefined;

    return {
      brandName,
      logoUrl: r2PublicAssetUrl(salon.logoKey),
      contactEmail,
      footerLine,
    };
  }

  async getEventByCategoryAndSlug(category: string, slug: string) {
    if (!slug?.trim() || !category?.trim()) {
      throw new BadRequestException('CATEGORY_AND_SLUG_REQUIRED');
    }

    const event = await findEventByCategoryAndSlug(
      this.prisma,
      category,
      slug,
      {
        include: {
          links: true,
          participants: true,
          instructions: true,
          user: { select: { salonProfile: { select: { mark: true } } } },
        },
      },
    ) as Prisma.EventGetPayload<{
      include: {
        links: true;
        participants: true;
        instructions: true;
        user: { select: { salonProfile: { select: { mark: true } } } };
      };
    }>;

    const salonMark = event.user?.salonProfile?.mark ?? null;
    const { user: _user, ...rest } = event;
    return { ...rest, salonMark };
  }

  async getAllPublicEvent(category : string , start_date : string, end_date : string){
    
    const events = this.prisma.event.findMany({
      where : { isPrivate :false}
    })

     if(!events) return [];
     return  events 
 }  

 async deleteEventPageByslug(category: string, slug: string) {
  const deleted = this.prisma.event.delete({
    where:  { category, slug  }, 
    include: { links: true, participants: true },
  });
 
  return deleted
}
async updateEventAccessCode(url: string, _code?: string) {
  const parts = url.split('_');

  if (parts.length !== 2) {
    throw new BadRequestException("URL format must be 'category_slug'");
  }

  const [category, slug] = parts;

  const event = await this.prisma.event.findUnique({
    where: { slug },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!event || event.category !== category) {
    throw new NotFoundException('EVENT_NOT_FOUND');
  }

  if (!event.isPrivate) {
    throw new BadRequestException('EVENT_IS_NOT_PRIVATE');
  }

  const hashed = await hashing();

  await this.prisma.event.update({
    where: { slug },
    data: { accessCode: hashed.hashed },
  });

  await this.notifyOrganizerAccessCode(event, hashed.plain);

  return { success: true, code: hashed.plain };
}

async updateImage(
  userId: string,
  category: string,
  slug: string,
  file?: Express.Multer.File
) {

  
  const event = await this.prisma.event.findUnique({
    where: {   category, slug  },
    include: { links: true, participants: true },
  });


  if (!event) {
    throw new BadRequestException("EVENT_NOT_FOUND");
  }
    if (event.userId !== userId) {
    throw new ForbiddenException("You can only update your own events");
  }

  if (event.userId !== userId) {
    throw new ForbiddenException("NOT_AUTHORIZED");
  }

  if (!file) {
    throw new BadRequestException("IMAGE_NOT_FOUND");
  }




// Path of old image (absolute)
const oldImagePath = event.eventImage

// Delete old image if exists
if (oldImagePath) {
  await this.r2Service.deleteFile(oldImagePath)
}
const newImagePath = await this.r2Service.uploadFile(file,"event")


  // Update event with new image
  const updatedEvent = await this.prisma.event.update({
    where: { slug },
    data: { eventImage: newImagePath },
  });

  return updatedEvent;
}


async updateEvent(userId: string, category : string ,slug: string, dto: Partial<CreateEventDto>) {
  const event = await this.prisma.event.findUnique({
    where: {  category ,slug },
    include: { links: true, participants: true, instructions: true },
  });

  if (!event) {
    throw new BadRequestException("EVENT_NOT_FOUND");
  }

  if (event.userId !== userId) {
    throw new ForbiddenException("You can only update your own events");
  }

  // -------------------- Parse Links --------------------
  let links: any[] = [];
  if (dto.links) {
    try {
      links = typeof dto.links === 'string' ? JSON.parse(dto.links) : dto.links;
    } catch (e) {
      throw new BadRequestException('INVALID_JSON_LINKS');
    }
  }

  // -------------------- Parse Participants --------------------
  let participants: any[] = [];
  if (dto.participants) {
    try {
      participants = typeof dto.participants === 'string'
        ? JSON.parse(dto.participants)
        : dto.participants;
    } catch (e) {
      throw new BadRequestException('INVALID_JSON_PARTICIPANTS');
    }
  }

  // -------------------- Parse Instructions --------------------
  let instructions: any[] = [];
  if (dto.instructions) {
    try {
      instructions =
        typeof dto.instructions === 'string'
          ? JSON.parse(dto.instructions)
          : dto.instructions;
    } catch (e) {
      throw new BadRequestException('INVALID_JSON_instructions');
    }
  }

  // -------------------- Parse Tags --------------------
  const tagsArray: string[] = Array.isArray(dto.tags)
    ? dto.tags
    : typeof dto.tags === 'string'
      ? (dto.tags as string).split(',').map((t) => t.trim()).filter(Boolean)
      : [];

  // -------------------- Update Event --------------------
  const updated = await this.prisma.event.update({
    where: { slug ,category },
    data: {
      title: dto.title ?? event.title,
      description: dto.description ?? event.description,
      location: dto.location ?? event.location,
      category: dto.category ?? event.category,
      capacity:
        dto.capacity !== undefined
          ? validateAndStringifyCapacity(dto.capacity)
          : event.capacity,
      price: dto.price !== undefined ? (dto.price == null ? null : String(dto.price)) : (event.price ?? null),
      date: dto.date ? new Date(dto.date) : event.date,
      time: dto.time ?? event.time,
      duration: dto.duration ?? event.duration,
      contact: dto.contact ?? event.contact,
      isPrivate: dto.isPrivate !== undefined ? dto.isPrivate : event.isPrivate,
      mapUrl: dto.mapUrl ?? event.mapUrl,
      tags: dto.tags !== undefined ? tagsArray : event.tags,
      links: links.length
        ? {
            create: links
              .filter((l: { title?: string; url?: string }) =>
                Boolean(l.title?.trim() || l.url?.trim()),
              )
              .map((l: { title?: string; url?: string }) => ({
                title: l.title?.trim() || 'No Title',
                url: l.url?.trim() ?? '',
              })),
          }
        : undefined,
      participants: participants.length
        ? { create: participants.map((p: any) => ({ name: p.name, role: p.role })) }
        : undefined,
      instructions: dto.instructions !== undefined
        ? {
            deleteMany: {},
            create: instructions.map((i: any) => ({ rule: i.rule })),
          }
        : undefined,
    },
    include: { links: true, participants: true, instructions: true },
  });

  return updated;
}


async joinEvent(category : string ,slug: string, dto: JoinEventDTO) {
  const event = await this.prisma.event.findUnique({
    where: { category, slug },
    include: { links: true, participants: true, user: true },
  });

  if (!event) {
    throw new BadRequestException("EVENT_NOT_FOUND");
  }

  const joinEmail = dto.email.trim().toLowerCase();
  const ownerEmail = event.user?.email?.trim().toLowerCase();
  const contactEmail = event.contact?.trim().toLowerCase();
  if (
    !isInviteEmailException(joinEmail) &&
    ((ownerEmail && joinEmail === ownerEmail) ||
      (contactEmail && joinEmail === contactEmail))
  ) {
    throw new BadRequestException("ORGANIZER_CANNOT_JOIN");
  }

  const alreadyJoined = event.participants.some(
    (p) => p.email?.trim().toLowerCase() === joinEmail,
  );
  if (alreadyJoined) {
    throw new BadRequestException("ALREADY_JOINED");
  }

  const guestLimit = resolveGuestLimit(event.capacity);
  const guestCount = countEventGuests(event.participants);
  if (guestCount >= guestLimit) {
    throw new BadRequestException('EVENT_FULL');
  }

  const updated = await this.prisma.event.update({
     where: {  category ,slug },
    data: {
      participants: {
        create: {
          name: dto.fullName.trim(),
          email: joinEmail,
          role: "Referent",
        },
      },
    },
    include: { links: true, participants: true },

  
  });

    if (updated) {
      const salonMark = await this.salonMarkForUser(event.userId);
      const brand = await this.salonBrandForUser(event.userId);
      const linkCategory = event.category ?? category;
      const confirmUrl = eventConfirmJoinUrl(
        linkCategory,
        slug,
        dto.email,
        true,
        salonMark,
      );
      const declineUrl = eventConfirmJoinUrl(
        linkCategory,
        slug,
        dto.email,
        false,
        salonMark,
      );
      try {
        await this.mailService.confirmEventJoin({
          email: dto.email,
          name: dto.fullName,
          eventTitle: event.title,
          confirmUrl,
          declineUrl,
          eventDateTime: formatEventDateTime(event),
          eventLocation: event.location ?? undefined,
          category: event.category ?? category,
          slug,
          salonMark,
          brand,
        });
      } catch (err) {
        console.error('Event join email failed:', err);
      }
    }
  return updated;

}


async confirmJoiningEvent(
  category: string,
  slug: string,
  email: string,
  confirm: boolean,
) {
  const event = await findEventByCategoryAndSlug(
    this.prisma,
    category,
    slug,
    { include: { participants: true } },
  ) as Prisma.EventGetPayload<{ include: { participants: true } }>;

  const normalizedEmail = email.trim().toLowerCase();
  const participant = event.participants.find(
    (p) => p.email?.trim().toLowerCase() === normalizedEmail,
  );

  if (!participant) {
    throw new BadRequestException("PARTICIPANT_NOT_FOUND");
  }

  // When confirming: reject if already confirmed
  if (confirm && participant.confirmed) {
    throw new BadGatewayException("ALREADY_CONFIRMED");
  }

  const now = new Date();
  const updated = await this.prisma.participant.update({
    where: { id: participant.id },
    data: {
      confirmed: confirm,
      declined: !confirm,
      respondedAt: now,
    },
  });

  if (confirm && participant.email) {
    try {
      const salonMark = await this.salonMarkForUser(event.userId);
      await this.mailService.sendEventTicketConfirmed({
        email: participant.email,
        name: participant.name,
        eventTitle: event.title,
        eventDateTime: formatEventDateTime(event),
        eventLocation: event.location ?? undefined,
        category: event.category ?? category,
        slug,
        statusLabel: 'Confirmé',
        salonMark,
      });
    } catch (err) {
      console.error('Confirmed ticket email failed:', err);
    }
  }

  return {
    message: confirm
      ? "Your registration has been confirmed!"
      : "You have declined / left the event.",
    participant: updated,
  };
}

  /** One-click email link: confirm/decline then redirect to frontend */
  async confirmJoiningEventAndRedirect(
    category: string,
    slug: string,
    email: string,
    confirm: boolean,
  ): Promise<string> {
    const event = await findEventByCategoryAndSlug(this.prisma, category, slug);
    const salonMark = await this.salonMarkForUser(event.userId);
    await this.confirmJoiningEvent(category, slug, email, confirm);
    const status = confirm ? 'confirmed' : 'declined';
    const linkCategory = event.category ?? category;
    const base = salonMark
      ? buildSalonEventAbsoluteUrl(salonMark, linkCategory, slug)
      : `${frontendBaseUrl()}/smart-event/${encodeURIComponent(normalizeEventCategory(linkCategory))}/${encodeURIComponent(slug.trim())}`;
    return `${base}?rsvp=${status}`;
  }

  async inviteBulkFromCsv(
    userId: string,
    category: string,
    slug: string,
    file: Express.Multer.File | undefined,
    accessCode?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV_FILE_REQUIRED');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, plan: true },
    });
    if (!owner) {
      throw new BadRequestException('USER_NOT_FOUND');
    }
    await assertUserHasPaidPlan(this.stripeService, userId);
    assertBusinessPlan(owner.plan);

    const event = (await findEventByCategoryAndSlug(
      this.prisma,
      category,
      slug,
      {
        matchCategory: false,
        include: {
          participants: true,
          user: { select: { email: true } },
        },
      },
    )) as Prisma.EventGetPayload<{
      include: {
        participants: true;
        user: { select: { email: true } };
      };
    }>;
    if (event.userId !== userId) {
      throw new ForbiddenException('NOT_EVENT_OWNER');
    }

    await this.verifyPrivateEventAccess(event, accessCode);

    const plan = await this.prisma.plan.findUnique({
      where: { tier: PlanTier.BUSINESS },
    });
    const maxPerBatch = plan?.maxEmails ?? 500;

    const rows = parseInviteCsv(file.buffer);
    if (rows.length === 0) {
      throw new BadRequestException('CSV_EMPTY_OR_INVALID');
    }
    if (rows.length > maxPerBatch) {
      throw new BadRequestException('CSV_TOO_MANY_ROWS');
    }

    const ownerEmail = owner.email?.trim().toLowerCase();
    const contactEmail = event.contact?.trim().toLowerCase();
    const existingEmails = new Set(
      event.participants
        .map((p) => p.email?.trim().toLowerCase())
        .filter(Boolean) as string[],
    );

    const guestLimit = resolveGuestLimit(event.capacity);
    let guestCount = countEventGuests(event.participants);
    const remainingSlots = Math.max(0, guestLimit - guestCount);
    if (remainingSlots <= 0) {
      throw new BadRequestException('EVENT_GUEST_LIMIT_REACHED');
    }
    if (rows.length > remainingSlots) {
      throw new BadRequestException('CSV_EXCEEDS_EVENT_GUEST_LIMIT');
    }

    const salonMark = await this.salonMarkForUser(event.userId);
    const brand = await this.salonBrandForUser(event.userId);
    const privateCodeForEmail = event.isPrivate ? accessCode?.trim() : undefined;

    const skipped: { email: string; reason: string }[] = [];
    const toQueue: typeof rows = [];

    for (const row of rows) {
      const email = row.email;
      const inviteException = isInviteEmailException(email);

      if (
        !inviteException &&
        ((ownerEmail && email === ownerEmail) ||
          (contactEmail && email === contactEmail))
      ) {
        skipped.push({ email, reason: 'ORGANIZER_CANNOT_INVITE' });
        continue;
      }
      if (!inviteException && existingEmails.has(email)) {
        skipped.push({ email, reason: 'ALREADY_INVITED' });
        continue;
      }
      if (guestCount >= guestLimit) {
        skipped.push({ email, reason: 'EVENT_FULL' });
        continue;
      }

      toQueue.push(row);
      if (!inviteException) {
        existingEmails.add(email);
      }
      guestCount += 1;
    }

    const batchId = randomUUID();
    const remainingAfter = Math.max(0, guestLimit - guestCount);

    if (toQueue.length > 0) {
      const payload: InviteBulkEventPayload = {
        batchId,
        eventId: event.id,
        category,
        slug,
        salonMark,
        brand,
        privateCodeForEmail,
        ownerEmail,
        contactEmail,
        rows: toQueue,
        existingEmails: [...existingEmails],
        guestLimit,
        eventTitle: event.title,
        eventDateTime: formatEventDateTime(event),
        eventLocation: event.location ?? undefined,
        eventCategory: event.category ?? category,
      };
      this.eventEmitter.emit(INVITE_BULK_EVENT, payload);
    }

    return {
      status: toQueue.length > 0 ? 'accepted' : 'done',
      message:
        toQueue.length > 0
          ? 'Invitations are being sent in the background.'
          : 'No invitations to send.',
      batchId,
      totalInCsv: rows.length,
      queued: toQueue.length,
      skipped,
      guestCount,
      guestLimit,
      remainingSlots: remainingAfter,
      isFull: remainingAfter <= 0,
      maxGuestsPerEvent: MAX_GUESTS_PER_EVENT,
    };
  }


  
async changePrivacy(userId: string, slug: string, isPrivate: boolean) {
  if (!userId) {
    throw new BadGatewayException('User ID is required');
  }

  if (!slug) {
    throw new BadGatewayException('Slug is required');
  }

  const event = await this.prisma.event.findUnique({
    where: { slug },
    include: {
      links: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!event) {
    throw new NotFoundException('event not found');
  }

  if (event.userId !== userId) {
    throw new ForbiddenException('You are not allowed to change this event');
  }

  let plainCode: string | undefined;

  if (isPrivate) {
    const hashed = event.accessCode
      ? null
      : await hashing();

    if (hashed) {
      plainCode = hashed.plain;
      await this.prisma.event.update({
        where: { slug },
        data: {
          isPrivate: true,
          accessCode: hashed.hashed,
        },
      });
      await this.notifyOrganizerAccessCode(event, plainCode);
    } else {
      await this.prisma.event.update({
        where: { slug },
        data: { isPrivate: true },
      });
    }
  } else {
    await this.prisma.event.update({
      where: { slug },
      data: { isPrivate: false, accessCode: null },
    });
  }

  const updated = await this.prisma.event.findUnique({
    where: { slug },
    include: { links: true, participants: true, instructions: true },
  });

  return {
    ...updated,
    ...(plainCode ? { code: plainCode } : {}),
  };
}
 
}
