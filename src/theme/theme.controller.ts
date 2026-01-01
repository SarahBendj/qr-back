import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('theme')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  // GET /theme -> récupère tous les thèmes
  @Get()
  async getAllThemes() {
    return this.themeService.getAllThemes();
  }

  // POST /theme/:portfolioId/:themeId -> met à jour le thème d’un portfolio
  @UseGuards(JwtAuthGuard)
  @Post(':portfolioId/:themeId')
  async updatePortfolioTheme(
    @Param('portfolioId') portfolioId: string,
    @Param('themeId') themeId: string,
    @Req() req,
  ) {
    const userId = req.user?.id;
    console.log("🟦 User ID from  THEEEEEEEEEEEEME request:", userId); // Debug log

    if (!userId) {
      throw new Error("Utilisateur non connecté");
    }

    const updatedPortfolio = await this.themeService.updatePortfolioTheme({
      portfolioId,
      themeId,
      userId,
    });

    return updatedPortfolio;
  }
}
