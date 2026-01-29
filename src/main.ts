import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        const message = errors.map((e) => Object.values(e.constraints ?? {}).join('; ')).join(' | ');
        console.error('[ValidationPipe] Bad Request:', message, errors);
        return new BadRequestException({
          message: 'Validation failed',
          errors: errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
          })),
        });
      },
    }),
  );

  // Crée les dossiers si absents
  const cvDir = join(process.cwd(), 'uploads', 'cv');
  const profileDir = join(process.cwd(), 'uploads', 'profile-picture');
  const eventDir = join(process.cwd(), 'uploads', 'event');
  const portfolioDir = join(process.cwd(), 'uploads', 'portfolio', 'projects');

  if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir, { recursive: true });
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
  if (!fs.existsSync(eventDir)) fs.mkdirSync(eventDir, { recursive: true });
  if (!fs.existsSync(portfolioDir)) fs.mkdirSync(portfolioDir, { recursive: true });

  // Expose statiquement
  app.use(cookieParser());


app.use(
  '/stripe/webhook',
  bodyParser.raw({ type: 'application/json' }),
);

  app.useStaticAssets(cvDir, { prefix: '/uploads/cv/' });
  app.useStaticAssets(profileDir, { prefix: '/uploads/profile-picture/' });
  app.useStaticAssets(eventDir, { prefix: '/uploads/event/' });
  app.useStaticAssets(portfolioDir, { prefix: '/uploads/portfolio/projects/'});
    app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableCors();
  app.set('trust proxy', true);
  await app.listen(port || 5000);

}
bootstrap();
