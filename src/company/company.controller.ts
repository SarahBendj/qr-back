import { Controller, Post, Get, Body, Param, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CompanyService } from './company.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * List missions (job offers) for the candidate's portfolio. Authenticated owner only.
   */
  @UseGuards(JwtAuthGuard)
  @Get('portfolio/:slug/missions')
  async getMissions(
    @Param('slug') slug: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.companyService.getMissionsByPortfolioSlug(slug, req.user.id);
  }

  /**
   * Submit recruiter proposal (company + mission) for a candidate's portfolio.
   * Public; rate-limited to reduce spam.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute per IP
  @Post('portfolio/:slug/mission')
  async createMission(
    @Param('slug') slug: string,
    @Body() dto: CreateMissionDto,
  ) {
    return this.companyService.createMissionFromProposal(slug, dto);
  }

  /** Update mission (accept/reject). Authenticated owner only. */
  @UseGuards(JwtAuthGuard)
  @Patch('portfolio/:slug/mission/:missionId')
  async updateMission(
    @Param('slug') slug: string,
    @Param('missionId') missionId: string,
    @Body() dto: UpdateMissionDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.companyService.updateMission(slug, missionId, req.user.id, dto);
  }

  /** Delete mission. Authenticated owner only. */
  @UseGuards(JwtAuthGuard)
  @Delete('portfolio/:slug/mission/:missionId')
  async deleteMission(
    @Param('slug') slug: string,
    @Param('missionId') missionId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.companyService.deleteMission(slug, missionId, req.user.id);
  }
}
