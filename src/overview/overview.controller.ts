import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OverviewService } from './overview.service';

@Controller('overview')
export class OverviewController {
  constructor(
    private readonly overviewService: OverviewService,
    private readonly jwt: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getDashboard(@Req() req: { user: { id: string } }) {
    return this.overviewService.getDashboard(req.user.id);
  }

  @Post('view/:category/:slug')
  recordView(
    @Param('category') category: string,
    @Param('slug') slug: string,
    @Query('source') source?: string,
    @Headers('authorization') authorization?: string,
  ) {
    let viewerUserId: string | undefined;
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      try {
        const payload = this.jwt.verify<{ sub?: string }>(bearer);
        if (payload?.sub) viewerUserId = payload.sub;
      } catch {
        // anonymous view — still record
      }
    }
    return this.overviewService.recordEventView(
      category,
      slug,
      source,
      viewerUserId,
    );
  }
}
