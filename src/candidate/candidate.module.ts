import { Module } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { CandidateController } from './candidate.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { R2Module } from 'src/r2/r2.module';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  providers: [CandidateService],
  imports: [PrismaModule, R2Module, StripeModule],
  controllers: [CandidateController],
})
export class CandidateModule {}
