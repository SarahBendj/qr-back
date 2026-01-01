import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { API_KEY_METADATA, ApiKeyConfig } from '../decorators/api-key-decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {

  private prisma = new PrismaClient();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
  
    const config = this.reflector.get<ApiKeyConfig>(
      API_KEY_METADATA,
      context.getHandler(),
    );

    if (!config) return true; // pas protégé

    const request = context.switchToHttp().getRequest();
    const plainKey = request.headers['x-api-key'];

    if (!plainKey) {
      throw new UnauthorizedException('Missing API Key');
    }
     console.log(plainKey)
    // Construire le WHERE dynamique
    const where: any = {};
    for (const key of config.lookup) {
      where[key] = request.params[key];
    }

    const table = (this.prisma as any)[config.table];
  

    if (!table) {
      throw new ForbiddenException(`Table '${config.table}' does not exist in Prisma`);
    }

    const record = await table.findUnique({ where });


    if (!record) {
      throw new NotFoundException('Resource not found');
    }

    const hashedKey = record[config.field];

    if (!hashedKey) {
      throw new ForbiddenException(`No API key stored for this resource`);
    }

    const isValid = await bcrypt.compare(String(plainKey), hashedKey);

    if (!isValid) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return true;
  }
}
