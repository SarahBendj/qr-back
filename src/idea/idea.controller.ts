import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { IdeaService } from './idea.service';
import { CreateIdeaDto, UpdateIdeaDto } from './dto/idea';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('idea')
export class IdeaController {
  constructor(private readonly ideaService: IdeaService) {}

  @Get('portfolio/:slug')
  async getIdeasByPortfolioSlug(@Param('slug') slug: string) {
    return this.ideaService.findAllByPortfolioSlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('portfolio/:slug')
  async createIdea(
    @Param('slug') slug: string,
    @Body() dto: CreateIdeaDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ideaService.create(req.user.id, slug, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('portfolio/:slug/:ideaId')
  async updateIdea(
    @Param('slug') slug: string,
    @Param('ideaId') ideaId: string,
    @Body() dto: UpdateIdeaDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ideaService.update(req.user.id, slug, ideaId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('portfolio/:slug/:ideaId')
  async deleteIdea(
    @Param('slug') slug: string,
    @Param('ideaId') ideaId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.ideaService.delete(req.user.id, slug, ideaId);
  }
}
