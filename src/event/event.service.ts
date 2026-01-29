import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto, JoinEventDTO } from './dto/event';
import { hash, randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as QRCode from 'qrcode';
import { hashing } from 'lib/hashing';
import { R2Service } from 'src/r2/r2.service';

import { SmartQRUserMailing } from 'lib/mail/send.mail';



@Injectable()
export class EventService {
  private prisma = new PrismaClient();
  constructor(private readonly r2Service: R2Service,
               private readonly mailService: SmartQRUserMailing
  ) {}


  async createEvent(userId : string, dto: CreateEventDto, file?: Express.Multer.File) {
      // Génération d’un code d’accès aléatoire si l’événement est privé
    let accessCode;

    const eventCount = await this.prisma.event.count({
      where: { userId },
    });
    console.log(eventCount)
    console.log(dto)

    if (eventCount >= 10) {
      throw new ForbiddenException("MAX_REACHED_EVENT_3");
    }

    const slug = randomUUID().slice(0, 12);
    const category = dto.category || 'info';


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

    let instructions: any[] = [];
    if (dto.instructions) {
      try {
        instructions = typeof dto.instructions === 'string'
          ? JSON.parse(dto.instructions)
          : dto.instructions;
      } catch (e) {
        throw new BadRequestException('INVALID_JSON_instructions');
      }
    }
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
    console.log(tagsArray)

    // -------------------- Create Event --------------------
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        category: category,
        capacity: dto.capacity !== undefined ? (dto.capacity == null ? null : String(dto.capacity)) : null,
        price: dto.price !== undefined ? (dto.price == null ? null : String(dto.price)) : null,
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        duration: dto.duration ?? null,
        contact: dto.contact,
        visibility: dto.visibility,
        user : { connect : { id : userId} },
        isPrivate:  isPrivate,
        eventImage: imageUrl,
        mapUrl: dto.mapUrl ?? null,
        accessCode : accessCode?.hashed ?? null,
        slug,
        tags :tagsArray,
        links: links.length
          ? { create: links.map((l: any) => ({ title: l.title ?? "No Title", url: l.url })) }
          : undefined,
        participants: participants.length
          ? { create: participants.map((p: any) => ({ name: p.name, role: p.role , confirmed : true })) }
          : undefined,
        instructions : instructions.length
          ? { create: instructions.map((i: any) => ({ rule: i.rule, })) }
          : undefined,
      },
      include: { links: true, participants: true , instructions : true },
    });
  

 
    // -------------------- Generate QR Code --------------------
    const qrUrl = `/smart-event/${dto.category}/${slug}`;
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      margin: 1,
      width: 350,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const qrCodeDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
  

    return {
      ...event,
      qrUrl,
      code : accessCode?.plain ,
      qrCode: qrCodeDataUrl,
    };
  }

  async getEventByCategoryAndSlug(category: string, slug: string) {
    if (!slug || !category) {
      throw new BadRequestException('CATEGORY_AND_SLUG_REQUIRED');
    }

    const event = await this.prisma.event.findUnique({
      where: { slug, category },

      include: { links: true, participants: true , instructions : true },
    });


    if (!event) {
      throw new BadRequestException('EVENT_NOT_FOUND');
    }

    return event;
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
async updateEventAccessCode(url: string, code: string) {

  const parts = url.split("_");

  if (parts.length !== 2) {
    throw new BadRequestException(
      "URL format must be 'category_slug'"
    );
  }

  const [category, slug] = parts;

  const hashed = await hashing(code);

  const updated = await this.prisma.event.update({
    where: { category, slug },
    data: { accessCode: hashed.hashed },
  });

  return { success: true, updated };
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
      capacity: dto.capacity !== undefined ? (dto.capacity == null ? null : String(dto.capacity)) : event.capacity,
      price: dto.price !== undefined ? (dto.price == null ? null : String(dto.price)) : (event.price ?? null),
      date: dto.date ? new Date(dto.date) : event.date,
      time: dto.time ?? event.time,
      duration: dto.duration ?? event.duration,
      contact: dto.contact ?? event.contact,
      visibility: dto.visibility ?? event.visibility,
      isPrivate: dto.isPrivate !== undefined ? dto.isPrivate : event.isPrivate,
      mapUrl: dto.mapUrl ?? event.mapUrl,
      tags: dto.tags !== undefined ? tagsArray : event.tags,
      links: links.length
        ? { create: links.map((l: any) => ({ title: l.title ?? "No Title", url: l.url })) }
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
    where: {  category ,slug },
    include: { links: true, participants: true },
  });

  if (!event) {
    throw new BadRequestException("EVENT_NOT_FOUND");
  }

  const alreadyJoined = event.participants.some(
    (p) => p.email === dto.email
  );
  if (alreadyJoined) {
    throw new BadRequestException("ALREADY_JOINED");
  }

  const updated = await this.prisma.event.update({
     where: {  category ,slug },
    data: {
      participants: {
        create: {
          name: dto.fullName,
          email: dto.email,
          role: "Referent", 
        },
      },
    },
    include: { links: true, participants: true },

  
  });

    if(updated) {
 // 4️⃣ Send confirmation email
  if (updated) {
    const confirmUrl = `https://smart-qr.pro/smart-event/confirm?category=${category}&slug=${slug}&email=${dto.email}`;
    await this.mailService.confirmEventJoin(
      dto.email,
      dto.fullName,
      event.title,
      confirmUrl
    );
  }
    }
  return updated;

}


async confirmJoiningEvent( category : string ,slug: string , email : string
) {
  const event = await this.prisma.event.findUnique({
    where: {  category ,slug },
    include: { participants: true },
  });

  if (!event) {
    throw new NotFoundException("EVENT_NOT_FOUND");
  }

  const participant = event.participants.find((p) => p.email === email);

  if (!participant) {
    throw new BadRequestException("PARTICIPANT_NOT_FOUND");
  }
  //* ALGREDY CONFIRMED
  const email_confirmed = participant.confirmed
  if (email_confirmed){
    throw new BadGatewayException("ALREADY_CONFIRMED")
  }
  // 3️⃣ Mark as confirmed (add a `confirmed` field in Participant model)
  const updated = await this.prisma.participant.update({
    where: { id: participant.id },
    data: { confirmed: true },
  });

  return {
    message: "Your registration has been confirmed!",
    participant: updated,
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
    include: { links: true },
  });

  if (!event) {
    throw new NotFoundException('event not found');
  }


  if (event.userId !== userId) {
    throw new ForbiddenException('You are not allowed to change this event');


  }
  let privateVal: boolean = false
if(isPrivate) {
  privateVal = true
} else {
  privateVal = false
}

return await this.prisma.event.update({
  where: { slug },
  data: { isPrivate: privateVal }, 
});
 }
 
}
