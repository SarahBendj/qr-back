import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  UseGuards,
  Req,
  Delete,
  Patch,
  UploadedFiles,
  UnauthorizedException,
} from '@nestjs/common';

import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { CandidateService } from './candidate.service';
import { CreateCandidateDto, CreatePortfolioDto, UpdateAboutDto, UpdateCandidateDto, UpdatePortfolioDto } from './dto/candidate';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiKeyProtected } from 'src/common/decorators/api-key-decorator';
import { ApiKeyGuard } from 'src/common/decorators/api-key.guard';
import { Throttle } from '@nestjs/throttler';
import * as multer from 'multer';
import { Express } from 'express';



@Throttle({ default: { limit: 5, ttl:  60000 } })
@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  // ============================================================
  //  CANDIDATE CRUD
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
         storage: multer.memoryStorage(),
    }),
  )
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateCandidateDto,
    @Req() req
  ) {
    const candidate = await this.candidateService.createCandidate(
      req.user.email,
      req.user.id,
      dto,
      files.find(f => f.fieldname === 'image'),
      files.find(f => f.fieldname === 'pdf'),
    );

    return {
      slug: candidate.slug,
      url: candidate.qrUrl,
      qrBase64: candidate.qrCode,
      message: 'Candidate created successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('/assign-portfolio')
    async upgradePlan(@Req() req){
      const userId = req.user.id
    
      if(!userId){
        return new  UnauthorizedException()
      }
      const result =await this.candidateService.assignPortfolioToExistingProfil(userId)
      return result
      

    }


  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const candidate = await this.candidateService.getCandidateBySlug(slug);
    if (!candidate) return { error: 'Candidate not found' };
    return candidate;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  async updateBySlug(@Req() req, @Param('slug') slug: string, @Body() data: UpdateCandidateDto) {
    return this.candidateService.updateCandidateBySlug(req.user.id, slug, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':slug')
  async deleteBySlug(@Param('slug') slug: string , @Req() req) {
    const userId = req.user.id
    return this.candidateService.deleteCandidatePageByslug(userId,slug);
  }

  // ============================================================
  //  PRIVACY SETTINGS
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Patch('privacy/:slug')
  async updatePrivacy(
    @Req() req,
    @Param('slug') slug: string,
    @Body('isPrivate') isPrivacy: boolean
  ) {
    return this.candidateService.changePrivacy(req.user.id, slug, isPrivacy);
  }

  // ============================================================
  //  UPDATE CANDIDATE IMAGE
  // ============================================================

@UseGuards(JwtAuthGuard)
@Patch('image/:slug')
@UseInterceptors(
  FileInterceptor('file', {
    storage: multer.memoryStorage(),
  }),
)
async updateIMG(
  @Req() req,
  @Param('slug') slug: string,
  @UploadedFile() file: Express.Multer.File, // now this works
) {
  return this.candidateService.updateImage(req.user.id, slug, file);
}

@UseGuards(JwtAuthGuard)
@Patch('cv/:slug')
@UseInterceptors(FileInterceptor('cv', { storage: multer.memoryStorage() }))
async updatePDF(
  @Req() req,
  @Param('slug') slug: string,
  @UploadedFile() file: Express.Multer.File,
) {

  return this.candidateService.updateCv(req.user.id, slug, file);
}


  // ============================================================
  //  API-KEY PROTECTED ACCESS
  // ============================================================

  @UseGuards(ApiKeyGuard)
  @ApiKeyProtected({
    table: 'candidate',
    field: 'accessCode',
    lookup: ['slug'],
  })
  @Get('access/:slug')
  async getOnePrivate(@Param('slug') slug: string) {
    const event = await this.candidateService.getCandidateBySlug(slug);
    if (!event) return { message: 'Event not found' };
    return event;
  }



  // ============================================================
  //  PORTFOLIO (GET)
  // ============================================================

  @Get('portfolio/:slug')
  async getPortfoliosByCandidateSlug(@Param('slug') slug: string) {
    return this.candidateService.getPortfolioBySlug(slug);
  }

  @UseGuards(ApiKeyGuard)
  @ApiKeyProtected({
    table: 'candidate',
    field: 'accessCode',
    lookup: ['slug'],
  })
  @Get('access/portfolio/:slug')
  async getOnePortofolioPrivate(@Param('slug') slug: string) {
    const event = await this.candidateService.getPortfolioBySlug(slug);
   
    if (!event) return { message: 'Event not found' };
    return true;
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('access/:slug')
  // async getCodeAccess(@Param('slug') slug: string) {
  //   const code = await this.candidateService.getCode(slug);

  //   return { accessCode: code };
  // }




  // ============================================================
  //  PORTFOLIO PROJECTS - CREATE
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post('portfolio/projects/:slug')
  @UseInterceptors(
    AnyFilesInterceptor({
         storage: multer.memoryStorage(),
    }),
  )

  async createPortfolioProject(
    @Param('slug') slug: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req
  ) {
    const tags = body.tag
      ? Array.isArray(body.tag)
        ? body.tag
        : body.tag.split(',').map(t => t.trim())
      : [];

    const dto: CreatePortfolioDto = {
      title: body.title,
      description: body.description,
      tag: tags,
      link: body.link,
      image: files?.[0]?.filename ?? null,
      candidateSlug: slug,
    };

    return this.candidateService.createProject(req.user.id, slug, dto, files?.[0]);
  }

  // ============================================================
  //  PORTFOLIO PROJECTS - GET ALL
  // ============================================================

  @Get('portfolio/projects/:slug')
  async getProjectsByPortfolioSlug(@Param('slug') slug: string) {
  
    return this.candidateService.getProject(slug);
  }

  // ============================================================
  //  PORTFOLIO PROJECTS - DELETE
  // ============================================================

@UseGuards(JwtAuthGuard)
@Patch('portfolio/projects/:slug/:projectId')
@UseInterceptors(FileInterceptor('image', { storage: multer.memoryStorage() }))
async updateProjectById(
  @Param('slug') slug: string,
  @Param('projectId') projectId: string,
  @UploadedFile() file: Express.Multer.File, // maintenant file sera défini
  @Req() req
) {
  const body: UpdatePortfolioDto = req.body;

  return this.candidateService.updateProject(
    req.user.id,
    slug,
    projectId,
    body,
    file
  );
}



  @UseGuards(JwtAuthGuard)
  @Delete('portfolio/projects/:slug/:projectId')
  async deleteProjectById(
    @Param('slug') slug: string,
    @Param('projectId') projectId: string,
    @Req() req
  ) {
 
    return this.candidateService.deleteProject(
      req.user.id,
      slug,
      projectId
    );
  }


  /*============================================================
    PORTFOLIO PROJECTS - ABOUT
  ============================================================*/
  @UseGuards(JwtAuthGuard)
  @Get('portfolio/about/:slug')
  async getAboutSection(
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    return this.candidateService.getPortfolioAbout(userId, slug);
  }


  @UseGuards(JwtAuthGuard)
  @Patch('portfolio/about/:slug')
  async updateAboutSection(
    @Param('slug') slug: string,
    @Body() body: UpdateAboutDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
 
    return this.candidateService.updateAbout(userId, slug, body);
  }
}


