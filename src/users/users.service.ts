// users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string }) {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // async findById(id: number) {
  //   return this.prisma.user.findUnique({
  //     where: { id },
  //   });
  // }

  // async update(id: number, data: any) {
  //   return this.prisma.user.update({
  //     where: { id },
  //     data,
  //   });
  // }
}
