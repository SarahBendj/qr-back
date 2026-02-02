import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as multer from 'multer';
import { extname } from 'path';
import { EventService } from './event.service';
import { CreateEventDto, JoinEventDTO } from './dto/event';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiKeyGuard } from 'src/common/decorators/api-key.guard';
import { ApiKeyProtected } from 'src/common/decorators/api-key-decorator';
import { Express } from 'express';

import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';

/** Logs req.body before ValidationPipe runs (so we see payload even when validation fails). */
const LogCreateBodyInterceptor: NestInterceptor = {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    console.log('[POST /event] Content-Type:', req.headers['content-type']);
    console.log('[POST /event] req.body:', JSON.stringify(req.body, null, 2));
    return next.handle();
  },
};

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', { storage: multer.memoryStorage() }),
    LogCreateBodyInterceptor,
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateEventDto,
    @Req() req,
  ) {
    if (!req.user?.id) {
      throw new NotFoundException('User not found in request');
    }

    // Debug: raw body and content-type (multipart form fields vs JSON)
    console.log('Content-Type:', req.headers['content-type']);
    console.log('req.body (raw):', JSON.stringify(req.body, null, 2));
    console.log('dto (after validation):', dto);
    console.log('file:', file ? { fieldname: file.fieldname, size: file.size, mimetype: file.mimetype } : null);

    const event = await this.eventService.createEvent(req.user.id, dto, file);

    if (!event) {
      throw new NotFoundException('Event could not be created');
    }

    return {
      url: event.qrUrl,
      code: event.code,
      message: 'Event created successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('privacy/:slug')
  async updatePrivacy(
    @Req() req,
    @Param('slug') slug: string,
    @Body('isPrivate') isPrivacy: boolean,
  ) {
    const userId = req.user.id;

    const updated = await this.eventService.changePrivacy(
      userId,
      slug,
      isPrivacy,
    );
    return updated;
  }

  @Get(':category/:slug')
  async getOne(
    @Param('category') category: string,
    @Param('slug') slug: string,
  ) {
    const event = await this.eventService.getEventByCategoryAndSlug(
      category,
      slug,
    );
    if (!event) {
      return { message: 'Event not found' };
    }
    return event;
  }
  @UseGuards(ApiKeyGuard)
  @ApiKeyProtected({
    table: 'event',
    field: 'accessCode',
    lookup: ['category', 'slug'],
  })
  @Get('access/:category/:slug')
  async getOnePrivate(
    @Param('category') category: string,
    @Param('slug') slug: string,
  ) {
    const event = await this.eventService.getEventByCategoryAndSlug(
      category,
      slug,
    );
    if (!event) {
      return { message: 'Event not found' };
    }
    return event;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':category/:slug')
  async deleteBySlug(@Param('category') category, @Param('slug') slug: string) {
    const deleted = await this.eventService.deleteEventPageByslug(
      category,
      slug,
    );
    return deleted;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':category/:slug')
  async updateBySlug(
    @Req() req,
    @Param('slug') slug: string,
    @Param('category') category: string,
    @Body() data: any,
  ) {
    const userId = req.user.id;

    const updated = await this.eventService.updateEvent(
      userId,
      category,
      slug,
      data,
    );
    return updated;
  }
  @Patch(':category/:slug/register')
  async joinEvent(
    @Param('slug') slug: string,
    @Param('category') category: string,
    @Body() data: JoinEventDTO,
  ) {
    const updated = await this.eventService.joinEvent(category, slug, data);
    return updated;
  }

  @Throttle({
    short: {
      limit: 2,
      ttl: 10000,
    },
  })
  @Patch(':category/:slug/:email/confirm-join')
  async confirmJoining(
    @Param('slug') slug: string,
    @Param('category') category: string,
    @Param('email') email: string,
  ) {
    const updated = await this.eventService.confirmJoiningEvent(
      category,
      slug,
      email,
    );
    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('image/:category/:slug')
  @UseInterceptors(
    FileInterceptor('image', { storage: multer.memoryStorage() }),
  )
  async updateIMG(
    @Req() req,
    @Param('slug') slug: string,
    @Param('category') category: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.id;
    return this.eventService.updateImage(userId, category, slug, file);
  }
}
