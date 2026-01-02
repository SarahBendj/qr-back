import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CreateCandidateDto, CreatePortfolioDto, SoftSkillDto, UpdatePortfolioDto } from './dto/candidate';
import * as QRCode from 'qrcode';
import { hashing } from 'lib/hashing';
import { pdfToImage } from 'lib/pdfToImage';
import * as fs from 'fs';
import * as path from 'path';
import { isExemptedEmail } from 'lib/isExempted';
import { R2Service } from 'src/r2/r2.service';
import { StripeService } from 'src/stripe/stripe.service';
import { Express } from 'express';


@Injectable()
export class CandidateService {
  constructor(
    private readonly r2Service: R2Service,
    private readonly stripeService: StripeService
  ) {}
  private prisma = new PrismaClient();

  async createCandidate(userEmail : string ,userId :string ,dto: CreateCandidateDto, file?: Express.Multer.File,  pdfFile?: Express.Multer.File ) {
    
    if(!userId || !userEmail){
      throw new UnauthorizedException()
    }
  
    const candidateCount = await this.prisma.candidate.count({
      where: { userId },
    });

    if (candidateCount >= 1) {
      throw new ForbiddenException("MAX_REACHED_CANDIDATE_1");
    }
   
    const slug = randomUUID().slice(0, 22);


    let links: any[] = [];
    if (dto.links) {
      try {
        links = typeof dto.links === 'string' ? JSON.parse(dto.links) : dto.links;
      } catch (error) {
        console.error('Erreur de parsing des liens:', error);
      }
    }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// IMAGE DE PROFIL
    let imageUrl: string | undefined = dto.imageUrl;
    if (file) {
       
  imageUrl = await this.r2Service.uploadFile(file, "profile-picture");
}

     

   let cvUrl: string | undefined = dto.cvUrl;
if (pdfFile) {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Sauvegarde temporaire du PDF
  const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);
  fs.writeFileSync(tempPdfPath, pdfFile.buffer);

  // Conversion PDF -> PNG
  const conversion = await pdfToImage(tempPdfPath, tempDir);
  console.log(conversion )
  console.log('=======================================pdf to png ?')
  
  const pngPath = tempPdfPath.replace('.pdf', '.png');
  
  if (!fs.existsSync(pngPath)) {
    throw new InternalServerErrorException('PDF conversion failed');
  }
  
  const pngBuffer = fs.readFileSync(pngPath);
  
  const pngFile = {
    buffer: pngBuffer,
    originalname: `cv-${Date.now()}.png`,
    mimetype: 'image/png',
    fieldname: 'cv',
    encoding: '7bit',
    size: pngBuffer.length,
  } as Express.Multer.File;
  
  // Upload vers R2
  cvUrl = await this.r2Service.uploadFile(pngFile, 'cv');

  // Nettoyage des fichiers temporaires
  fs.unlinkSync(tempPdfPath);
  fs.unlinkSync(pngPath);
  
  console.log("✅ CV uploaded to R2:", cvUrl);
}




await this.prisma.user.update({
  where: { id: userId },
  data: {
    address: dto.address,
    country: dto.country,
    model: dto.model,
  },
});
const isPortfolio =(dto.model).toLocaleLowerCase() === 'portfolio'
// 2️⃣ Create Candidate
const candidate = await this.prisma.candidate.create({
  data: {
    firstname: dto.firstname,
    lastname: dto.lastname,
    title: dto.title,
    bio: dto.bio,
    cvUrl: cvUrl,
    status : isPortfolio ? 'pending': 'free' ,
    isPrivate: dto.isPrivate ?? false,
    imageUrl,
    slug,
    user: {
      connect: { id: userId },
    },
    links: { create: links || [] },
  },

  include: { links: true },
});

    let url: string;

    if(isPortfolio) {
      url = `smart-profile/portfolio/${slug}`;
      await this.prisma.user.update({
        data : { subscription : "PRO"},
        where : { id : userId}
      })


       //*create portfolio if not exists
      const existingPortfolio = await this.prisma.portfolio.findUnique({
        where: { userId: userId },
      });

      if (!existingPortfolio) {
        await this.prisma.portfolio.create({
          data: {
            userId: userId,
            title: `${dto.firstname} ${dto.lastname} Portfolio`,
            bio: dto.bio,
            image: imageUrl,
          },
        });
      }

      const invoiceStillActive = await this.stripeService.checkActiveSubscription(userId)

      //*EXEMPTED PPL
      //todo NEED TO  PRICE THE PAYMENTID 
    if (invoiceStillActive) {
       await this.prisma.payment.updateMany({
        where: { userId },
        data: { productId : candidate.id },
      });
}
     if (isExemptedEmail(userEmail) || invoiceStillActive) {
  await this.prisma.candidate.update({
    where: { userId },
    data: { status: 'active' },
  });

  await this.prisma.portfolio.update({
    where: { userId },
    data: { isPaid: true },
  });
}
    }
      else  {

      url = `smart-profile/${slug}`;
      }

  
    const qrBuffer = await QRCode.toBuffer(url, { type: 'png' });

    return {
      ...candidate,
      qrCode: qrBuffer.toString('base64'),
      qrUrl: url,
    };
  }

async assignPortfolioToExistingProfil(userId: string) {
  // 1. Vérifier que le candidat existe
  const candidate = await this.prisma.candidate.findUnique({ 
    where: { userId } 
  });

  if (!candidate) {
    throw new NotFoundException('Candidate not found');
  }

  // 2. Vérifier l'abonnement Stripe
  const invoiceStillActive = await this.stripeService.checkActiveSubscription(userId);
  
  const candidateStatus = invoiceStillActive ? 'active' : 'pending';
  const portfolioIsPaid = invoiceStillActive;

  // 3. Préparer les mises à jour de base
  const updates = [
    // Mise à jour du candidat
    this.prisma.candidate.update({
      where: { userId },
      data: { status: candidateStatus },
    }),

    // Mise à jour de l'utilisateur
    this.prisma.user.update({
      where: { id: userId },
      data: { 
        subscription: 'PRO',
        model: 'PORTFOLIO' 
      },
    }),

    // Upsert du portfolio
    this.prisma.portfolio.upsert({
      where: { userId },
      create: {
        userId,
        title: `${candidate.firstname} ${candidate.lastname} Portfolio`,
        isPaid: portfolioIsPaid,
      },
      update: {
        isPaid: portfolioIsPaid,
      },
    }),
  ];

  // 4. Mettre à jour les paiements si abonnement actif ET productId différent
  if (invoiceStillActive) {
    // Récupérer les paiements existants pour vérifier
    const existingPayments = await this.prisma.payment.findMany({
      where: { 
        userId,
        productId: { not: candidate.id } // Seulement ceux avec un productId différent
      },
    });

    // Mettre à jour seulement si nécessaire
    if (existingPayments.length > 0) {
      updates.push(
        this.prisma.payment.updateMany({
          where: { 
            userId,
            productId: { not: candidate.id }
          },
          data: { productId: candidate.id },
        })
      );
    }
  }

  // 5. Exécuter la transaction
  const [updatedCandidate, , portfolio] = await this.prisma.$transaction(updates);

  const url = `smart-profile/portfolio/${updatedCandidate.slug}`;

  return { 
    url, 
    candidate: updatedCandidate,
    portfolio,
    isPaid: portfolioIsPaid 
  };
}

  

async getCandidateBySlug(slug: string) {
  return this.prisma.candidate.findUnique({
    where: { slug },
    include: {
      links: true,
      user: {
        select: {
          address: true,
          country: true,
          model: true,
          name: true,
          picture: true,
          email: true,
          googleId : true
        },
      },
    },
  });
}


async updateCv(userId: string, slug: string, pdfFile?: Express.Multer.File) {
  if (!userId) {
    throw new BadGatewayException();
  }

  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
    include: { links: true },
  });

  if (!candidate) {
    throw new BadRequestException("EVENT_NOT_FOUND");
  }

  if (candidate.userId !== userId) {
    throw new ForbiddenException("You can only update your own candidates");
  }

  let newCvUrl = candidate.cvUrl;

  // ------------------------
  // 1️⃣ DELETE OLD CV FROM R2
  // ------------------------
  if (candidate.cvUrl) {
    try {
      const oldKey = candidate.cvUrl;
      await this.r2Service.deleteFile(oldKey);
      console.log("🗑️ Old CV removed from R2");
    } catch (error) {
      console.log("⚠️ Old CV not found in R2, nothing to delete.");
    }
  }

  if (pdfFile) {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Sauvegarde temporaire du PDF
    const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfFile.buffer);

    await pdfToImage(tempPdfPath, tempDir);
    
    // Le PNG a le même nom que le PDF mais avec .png
    const pngPath = tempPdfPath.replace('.pdf', '.png');
    
    if (!fs.existsSync(pngPath)) {
      throw new Error(`PNG conversion failed - file not found at ${pngPath}`);
    }
    
    // Lit le PNG converti
    const pngBuffer = fs.readFileSync(pngPath);
    
    // Crée un objet Multer-like pour R2Service
    const pngFile = {
      buffer: pngBuffer,
      originalname: `cv-${slug}-${Date.now()}.png`,
      mimetype: 'image/png',
      fieldname: 'cv',
      encoding: '7bit',
      size: pngBuffer.length,
    } as Express.Multer.File;
    
    // Upload vers R2
    const r2Key = await this.r2Service.uploadFile(pngFile, 'cv');
    
   if(!r2Key) {throw new BadGatewayException()}

    // Nettoyage des fichiers temporaires
    fs.unlinkSync(tempPdfPath);
    fs.unlinkSync(pngPath);
    

  await this.prisma.candidate.update({
    where: { slug },
    data: { cvUrl: r2Key },
  });

}
  return {
    message: "Candidate CV updated successfully",
    cvUrl: newCvUrl,
  };
}

async getPortfolioBySlug(slug: string) {
  return this.prisma.candidate.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          address: true,
          country: true,
          model: true,
          name: true,
          picture: true,
          email: true,
          googleId : true,
          portfolio: {
            include: {
              projects: true,
              softSkills: true,
              theme: true
            }
          }
        }
      },
      links: true
    }
  });
}


  
async changePrivacy(userId: string, slug: string, isPrivate: boolean) {
  if (!userId) {
    throw new BadGatewayException('User ID is required');
  }

  if (!slug) {
    throw new BadGatewayException('Slug is required');
  }

  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
    include: { links: true },
  });

  if (!candidate) {
    throw new NotFoundException('Candidate not found');
  }


  if (candidate.userId !== userId) {
    throw new ForbiddenException('You are not allowed to change this candidate');
  }
  let privateVal: boolean = false
if(isPrivate) {
  privateVal = true
} else {
  privateVal = false
}

return await this.prisma.candidate.update({
  where: { slug },
  data: { isPrivate: privateVal }, 
});
 }


async deleteCandidatePageByslug(userId : string, slug :string) {
   if (!userId) {
    throw new BadGatewayException('User ID is required');
  }

  if (!slug) {
    throw new BadGatewayException('Slug is required');
  }

  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
    include: {
      user: {
        include: {
          portfolio:  true },
        
        },
    },
  });

  
  if (!candidate) {
    throw new NotFoundException('Candidate not found');
  }
  if (candidate.userId !== userId) {
    throw new ForbiddenException('You are not allowed to change this candidate');
  }
  if( candidate.user.portfolio ){
        await this.prisma.portfolio.delete({
          where: { userId },
          
        });
  
      } 
      
      await this.prisma.candidate.delete({
          where : { slug},
          include: { links: true },
      });
   
    
  }


async updateImage(
    userId: string,
    slug: string,
    file?: Express.Multer.File
  ) {
    
  
    
    const candidate = await this.prisma.candidate.findUnique({
      where: {    slug  },
      include: { links: true },
    });
  
    if (!candidate) {
      throw new BadRequestException("EVENT_NOT_FOUND");
    }
      if (candidate.userId !== userId) {
      throw new ForbiddenException("You can only update your own candidates");
    }
  
    if (candidate.userId !== userId) {
      throw new ForbiddenException("NOT_AUTHORIZED");
    }
  
    if (!file) {
      throw new BadRequestException("IMAGE_NOT_FOUND");
    }
    if(candidate.imageUrl){
      const deleted = await this.r2Service.deleteFile(candidate.imageUrl)
      console.log(deleted)
    }
  

  
    const newImagePath = await this.r2Service.uploadFile(file, "profile-picture");
    console.log(newImagePath)

      const updatedImage = await this.prisma.candidate.update({
        where: { slug },
        data: { imageUrl: newImagePath },
    });
  
    return updatedImage  }
  

 

async updateCandidateBySlug(userId: string, slug: string, data: any) {
  if (!userId) throw new ForbiddenException();
  if (!slug) throw new BadRequestException();

  console.log("Updating candidate:", slug, "with data:", data);
  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
    include: { links: true },
  });

  if (!candidate) return null;
  if (candidate.userId !== userId) throw new ForbiddenException();

  try {
    const { links, country, address, ...candidateData } = data;

    let linkOps: any = undefined;

    if (Array.isArray(links)) {
      const existingIds = candidate.links.map(l => l.id);
      const incomingIds = links.filter(l => l.id).map(l => l.id);

      const toDeleteIds = existingIds.filter(id => !incomingIds.includes(id));
      const toUpdate = links.filter(l => l.id);
      const toCreate = links.filter(l => !l.id);

      linkOps = {
        ...(toDeleteIds.length && { deleteMany: { id: { in: toDeleteIds } } }),
        ...(toUpdate.length && { update: toUpdate.map(l => ({
          where: { id: l.id },
          data: { title: l.title, url: l.url },
        }))}),
        ...(toCreate.length && { create: toCreate.map(l => ({ title: l.title, url: l.url }))}),
      };
    }

    const updated = await this.prisma.candidate.update({
      where: { slug },
      data: {
        ...candidateData,
        links: linkOps || undefined,
        user: {
          update: {
            ...(country !== undefined && { country }),
            ...(address !== undefined && { address }),
          },
        },
      },
      include: { links: true, user: true },
    });

    return updated;
  } catch (error) {
    console.error(error);
    throw new InternalServerErrorException("Failed to update candidate");
  }
}


async updateCandidateAccessCode(url: string, code: string) {
  const slug = url.trim();
  const accessCode = await hashing(code)
  
  const updated = await this.prisma.candidate.update({
    where: { slug },
    data: { accessCode: accessCode.hashed },
  });

  return { success: true, updated };
}


//* PROJECTS
async createProject(
  userId: string,
  slug: string,
  dto : CreatePortfolioDto ,file?: Express.Multer.File,
 
) {
  // 1. Check candidate
  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
  });

  if (!candidate) {
    throw new NotFoundException('Candidate not found');
  }

  if (candidate.userId !== userId) {
    throw new ForbiddenException('You are not allowed to add projects to this candidate');
  }

  // 2. Ensure portfolio exists
  const portfolio = await this.prisma.portfolio.findUnique({
    where: { userId: candidate.userId },
  });

  if (!portfolio) {
    throw new NotFoundException('Portfolio not found for this candidate');
  }

   const projectCount = await this.prisma.project.count({
      where: { portfolioId: portfolio.id },
    });

    if (projectCount >= 3) {
      throw new ForbiddenException("MAX_REACHED_PROJECT_3");
    }

  let image: string | undefined = dto.image;
    if (file) {
      image = await this.r2Service.uploadFile(file ,"portfolio/projects")
      
    }
 const project = await this.prisma.project.create({
  data: {
    title: dto.title,
    description: dto.description,
    // tag: dto.tag || [],
    link: dto.link,
    image: image,
    portfolio: {
      connect: { id: portfolio.id }
    }
  },
});


  // (Optional) If you want to update portfolio metadata:
  // const updatedPortfolio = await this.prisma.portfolio.update({
  //   where: { id: portfolio.id },
  //   data: { updatedAt: new Date() }
  // });

  return project;
}

async getProject(slug: string) {
  console.log("getting projects for slug:", slug);
  // 1. Check candidate
  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
  });

  if (!candidate) {
    throw new NotFoundException('Candidate not found');
  }

  // 2. Get portfolio
  const portfolio = await this.prisma.portfolio.findUnique({
    where: { userId: candidate.userId },
  });

  if (!portfolio) {
    throw new NotFoundException('Portfolio not found for this candidate');
  }

  // 3. Get projects
  const projects = await this.prisma.project.findMany({
    where: { portfolioId: portfolio.id },
  });

  return projects;
}

async updateProject(
  userId: string,
  slug: string,
  projectId: string,
  dto : UpdatePortfolioDto ,file?: Express.Multer.File,
) {
  // 1. Vérifier candidate
  const candidate = await this.prisma.candidate.findUnique({ where: { slug } });
  if (!candidate) throw new NotFoundException('Candidate not found');
  if (candidate.userId !== userId)
    throw new ForbiddenException('You cannot update projects for this candidate');

  // 2. Vérifier portfolio
  const portfolio = await this.prisma.portfolio.findUnique({
    where: { userId: candidate.userId },
  });

  if (!portfolio) throw new NotFoundException('Portfolio not found');

  // 3. Vérifier project existant et appartenant au portfolio
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });
  console.log(project)
  
  if (!project) throw new NotFoundException('Project not found');
  if (project.portfolioId !== portfolio.id)
    throw new ForbiddenException('This project does not belong to this portfolio');

  

   let image: string | undefined = dto.image;
    if (file) {
      const oldR2File = project.image
      if( oldR2File){
      await this.r2Service.deleteFile(oldR2File)}
      
      image = await this.r2Service.uploadFile(file,"portfolio/projects")
    }


  // 4. Update
  const updated = await this.prisma.project.update({
    where: { id: projectId },
    data: {
      title : dto.title,
      tag: dto.tag
      ? dto.tag.split(',').map((t) => t.trim())
      : [], 
      description : dto.description,
      image : image,
      link : dto.link,
    },
  });

  return updated;
}

async deleteProject(
  userId: string,
  slug: string,
  projectId: string,
) {
  // 1. Vérifier candidate
  const candidate = await this.prisma.candidate.findUnique({ where: { slug } });
  if (!candidate) throw new NotFoundException('Candidate not found');
  if (candidate.userId !== userId)
    throw new ForbiddenException('You cannot delete projects for this candidate');

  // 2. Vérifier portfolio
  const portfolio = await this.prisma.portfolio.findUnique({
    where: { userId: candidate.userId },
  });
  if (!portfolio) throw new NotFoundException('Portfolio not found');

  // 3. Vérifier project
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundException('Project not found');
  if (project.portfolioId !== portfolio.id)
    throw new ForbiddenException('This project does not belong to this portfolio');

  // 4. Delete
  await this.prisma.project.delete({
    where: { id: projectId },
  });

  return { message: 'Project successfully deleted' };
}




async getPortfolioAbout(userId: string, slug: string) {
  return await this.prisma.candidate.findUnique({
    where: { slug },
    include: {
      user: {
        include: {
          portfolio: {
            include: { softSkills: true },
          },
        },
      },
    },
  });
}


async updateAbout(
  userId: string,
  slug: string,
  data: { bio?: string; skills?: string[] }
) {
  const candidate = await this.prisma.candidate.findUnique({
    where: { slug },
    include: {
      user: {
        include: {
          portfolio: {
            include: { softSkills: true },
          },
        },
      },
    },
  });

  if (!candidate) throw new NotFoundException('Candidate not found');
  if (candidate.userId !== userId)
    throw new ForbiddenException('You cannot edit this candidate');

  const portfolio = candidate.user.portfolio;
  if (!portfolio) throw new NotFoundException('Portfolio not found');

  // 1️⃣ Update bio if provided
  if (data.bio !== undefined) {
    await this.prisma.portfolio.update({
      where: { id : candidate.user.portfolio?.id },
      data: { bio: data.bio },
    });
  }

  console.log(data.skills)

  // 2️⃣ Update soft skills
  if (data.skills) {
    const existingSkills = portfolio.softSkills.map(s => s.skill.toLowerCase());
    const incomingSkills = data.skills
      .map(s => s.trim().toLowerCase())
      .filter(Boolean) // remove empty strings
      .slice(0, 8); // max 8 skills

    // Delete skills that no longer exist
    const skillsToDelete = portfolio.softSkills.filter(
      s => !incomingSkills.includes(s.skill.toLowerCase())
    );

    for (const skill of skillsToDelete) {
      await this.prisma.softSkill.delete({ where: { id: skill.id } });
    }

    // Add new skills that don’t exist yet
    for (const skill of incomingSkills) {
      console.log("Processing skill:", skill);
      if (!existingSkills.includes(skill)) {
        await this.prisma.softSkill.create({
          data: {
            portfolioId: portfolio.id,
            skill,
          },
        });
      }
    }
  }

  return 'success';
}


}