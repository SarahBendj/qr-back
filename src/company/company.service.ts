import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cast for mission/company delegates when generated client types are stale */
  private get db() {
    return this.prisma as PrismaService & {
      mission: {
        findMany: (args: unknown) => Promise<unknown[]>;
        findUnique: (args: unknown) => Promise<unknown>;
        create: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
        delete: (args: unknown) => Promise<unknown>;
      };
      company: { findFirst: (args: unknown) => Promise<unknown>; create: (args: unknown) => Promise<unknown> };
    };
  }

  /**
   * List missions for a candidate's portfolio. Authenticated owner only.
   */
  async getMissionsByPortfolioSlug(slug: string, userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: {
        user: {
          include: { portfolio: true },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.userId !== userId) {
      throw new ForbiddenException(
        'You can only view missions for your own portfolio',
      );
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      return [];
    }

    return this.db.mission.findMany({
      where: { portfolioId: portfolio.id },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a mission (job offer) from recruiter proposal form.
   * Resolves portfolio by candidate slug, finds or creates company by name, creates mission.
   */
  async createMissionFromProposal(slug: string, dto: CreateMissionDto) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: {
        user: {
          include: { portfolio: true },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      throw new BadRequestException(
        'This candidate has no portfolio; missions are only for portfolio candidates',
      );
    }

    const companyName = dto.companyName.trim();
    let company: { id: string } | null = await this.db.company.findFirst({
      where: { name: { equals: companyName, mode: 'insensitive' } },
    }) as { id: string } | null;
    if (!company) {
      company = (await this.db.company.create({
        data: { name: companyName },
      })) as { id: string };
    }

    const salary =
      dto.salaryMin || dto.salaryMax
        ? [dto.salaryMin, dto.salaryMax].filter(Boolean).join(' - ')
        : undefined;

    const descriptionParts: string[] = [];
    if (dto.purpose) descriptionParts.push(dto.purpose);
    if (dto.timeline) descriptionParts.push(`Timeline: ${dto.timeline}`);
    const description =
      descriptionParts.length > 0 ? descriptionParts.join('\n\n') : undefined;

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : undefined;

    const mission = await this.db.mission.create({
      data: {
        portfolioId: portfolio.id,
        companyId: company.id,
        position: dto.position,
        type: dto.isCDI ? 'CDI' : 'CDD',
        salary,
        description,
        startDate,
        status: 'pending',
        recruiterName: dto.recruiterName,
        recruiterEmail: dto.email,
        recruiterPhone: dto.phone ?? undefined,
      },
      include: {
        company: true,
      },
    });

    return mission;
  }

  /**
   * Update a mission (accept/reject). Authenticated owner only.
   */
  async updateMission(
    slug: string,
    missionId: string,
    userId: string,
    dto: UpdateMissionDto,
  ) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: { user: { include: { portfolio: true } } },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.userId !== userId) {
      throw new ForbiddenException(
        'You can only update missions for your own portfolio',
      );
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const mission = (await this.db.mission.findUnique({
      where: { id: missionId },
    })) as { id: string; portfolioId: string } | null;

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.portfolioId !== portfolio.id) {
      throw new ForbiddenException('This mission does not belong to your portfolio');
    }

    return this.db.mission.update({
      where: { id: missionId },
      data: { status: dto.status },
      include: { company: true },
    });
  }

  /**
   * Delete a mission. Authenticated owner only.
   */
  async deleteMission(slug: string, missionId: string, userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: { user: { include: { portfolio: true } } },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete missions for your own portfolio',
      );
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const mission = (await this.db.mission.findUnique({
      where: { id: missionId },
    })) as { id: string; portfolioId: string } | null;

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.portfolioId !== portfolio.id) {
      throw new ForbiddenException('This mission does not belong to your portfolio');
    }

    await this.db.mission.delete({
      where: { id: missionId },
    });

    return { message: 'Mission deleted successfully' };
  }
}
