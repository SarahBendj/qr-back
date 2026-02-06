import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIdeaDto, UpdateIdeaDto } from './dto/idea';

/** Max ideas per portfolio (cognitive memory limit). Adding beyond this replaces an existing idea. */
const MAX_IDEAS_PER_PORTFOLIO = 20;

@Injectable()
export class IdeaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List ideas for a portfolio by candidate slug.
   * Returns global ideas (portfolioId null) + portfolio-specific ideas, ordered.
   */
  async findAllByPortfolioSlug(slug: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: {
        user: {
          select: { portfolio: { select: { id: true } } },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const portfolioId = candidate.user?.portfolio?.id ?? null;

    const [globalIdeas, portfolioIdeas] = await Promise.all([
      this.prisma.idea.findMany({
        where: { portfolioId: null },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      portfolioId
        ? this.prisma.idea.findMany({
            where: { portfolioId },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          })
        : Promise.resolve([]),
    ]);

    return {
      global: globalIdeas,
      portfolio: portfolioIdeas,
    };
  }

  /**
   * Create an idea for the portfolio of the candidate identified by slug.
   * Owner only. Max 20 ideas per portfolio: when at limit, the new idea replaces one (oldest by default, or the one given in replaceIdeaId).
   */
  async create(userId: string, slug: string, dto: CreateIdeaDto) {
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
        'You are not allowed to add ideas to this portfolio',
      );
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found for this candidate');
    }

    const count = await this.prisma.idea.count({
      where: { portfolioId: portfolio.id },
    });

    if (count >= MAX_IDEAS_PER_PORTFOLIO) {
      if (dto.replaceIdeaId) {
        const toReplace = await this.prisma.idea.findUnique({
          where: { id: dto.replaceIdeaId },
        });
        if (!toReplace || toReplace.portfolioId !== portfolio.id) {
          throw new NotFoundException(
            'Idea to replace not found or does not belong to this portfolio',
          );
        }
        await this.prisma.idea.delete({
          where: { id: dto.replaceIdeaId },
        });
      } else {
        const oldest = await this.prisma.idea.findFirst({
          where: { portfolioId: portfolio.id },
          orderBy: { createdAt: 'asc' },
        });
        if (oldest) {
          await this.prisma.idea.delete({
            where: { id: oldest.id },
          });
        }
      }
    }

    return this.prisma.idea.create({
      data: {
        portfolioId: portfolio.id,
        title: dto.title,
        description: dto.description,
        order: dto.order ?? undefined,
      },
    });
  }

  /**
   * Update an idea. Owner only.
   */
  async update(
    userId: string,
    slug: string,
    ideaId: string,
    dto: UpdateIdeaDto,
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
        'You are not allowed to update ideas for this portfolio',
      );
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const idea = await this.prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (idea.portfolioId !== portfolio.id) {
      throw new ForbiddenException('This idea does not belong to this portfolio');
    }

    return this.prisma.idea.update({
      where: { id: ideaId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  /**
   * Delete an idea. Owner only.
   */
  async delete(userId: string, slug: string, ideaId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { slug },
      include: { user: { include: { portfolio: true } } },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete ideas for this portfolio',
      );
    }

    const portfolio = candidate.user?.portfolio;
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const idea = await this.prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (idea.portfolioId !== portfolio.id) {
      throw new ForbiddenException('This idea does not belong to this portfolio');
    }

    await this.prisma.idea.delete({
      where: { id: ideaId },
    });

    return { message: 'Idea deleted successfully' };
  }
}
