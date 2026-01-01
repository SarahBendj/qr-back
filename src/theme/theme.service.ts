import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ThemeService {
  private prisma = new PrismaClient();

  async getAllThemes() {
    return this.prisma.theme.findMany();
  }

  async updatePortfolioTheme({ portfolioId, themeId, userId }: { portfolioId: string; themeId: string; userId: string }) {
    // Vérifie que le portfolio appartient bien à l'utilisateur
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio non trouvé ou accès refusé");
    }

    // Met à jour le thème du portfolio
    return this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: { themeId },
      include: { theme: true },
    });
  }
}
