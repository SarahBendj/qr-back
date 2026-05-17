import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalonService } from './salon.service';
import { UpdateSalonDto } from './dto/update-salon.dto';

@Controller('salon')
export class SalonController {
  constructor(private readonly salonService: SalonService) {}

  @Get('public/:mark')
  getPublic(@Param('mark') mark: string) {
    return this.salonService.getPublicByMark(mark);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  getMine(@Req() req: { user: { id: string } }) {
    return this.salonService.getMine(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  upsert(@Req() req: { user: { id: string } }, @Body() dto: UpdateSalonDto) {
    return this.salonService.upsert(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload/logo')
  @UseInterceptors(
    FileInterceptor('file', { storage: multer.memoryStorage() }),
  )
  uploadLogo(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.salonService.uploadLogo(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload/banner')
  @UseInterceptors(
    FileInterceptor('file', { storage: multer.memoryStorage() }),
  )
  addBanner(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.salonService.addBanner(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('banner/:index')
  removeBanner(
    @Req() req: { user: { id: string } },
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.salonService.removeBanner(req.user.id, index);
  }
}
