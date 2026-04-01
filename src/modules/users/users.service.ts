import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithPassword(
    email: string,
  ): Promise<(User & { password: string }) | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async validateAdminCredentials(
    email: string,
    password: string,
  ): Promise<{ user: User } | null> {
    const user = await this.findByEmailWithPassword(email);
    if (!user || !user.isActive) {
      return null;
    }
    if (user.role !== UserRole.ADMIN) {
      return null;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return null;
    }
    return { user };
  }
}
