import { Module } from '@nestjs/common';
import { IdeaService } from './idea.service';
import { IdeaController } from './idea.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [IdeaService],
  controllers: [IdeaController],
  exports: [IdeaService],
})
export class IdeaModule {}
