import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { serializeUser } from '../../common/utils/serialize-user';
import { hasStaffPanelAccess } from '../../common/utils/user-role.util';
import type { JwtUserPayload } from '../../common/interfaces/jwt-user-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    if (!hasStaffPanelAccess(user.role)) {
      return null;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return null;
    }
    return { user };
  }

  async findAllForAdmin(query: QueryUserDto) {
    const rawPage = query.page ?? 1;
    const rawLimit = query.limit ?? 20;
    const page =
      Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100
        ? Math.floor(rawLimit)
        : 20;

    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = rows.map((u) => serializeUser(u));
    return createPaginatedResponse(data, page, limit, total);
  }

  async findOneSerialized(id: string) {
    const user = await this.getByIdOrThrow(id);
    return serializeUser(user);
  }

  async createUser(dto: CreateUserDto, actor: JwtUserPayload) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Solo un super administrador puede crear usuarios');
    }
    const role = dto.role ?? UserRole.CLIENT;
    if (role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No se puede crear otro super administrador desde la API',
      );
    }
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hash,
        role,
        isActive: dto.isActive ?? true,
      },
    });
    return serializeUser(created);
  }

  async updateUser(id: string, dto: UpdateUserDto, actor: JwtUserPayload) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Solo un super administrador puede editar usuarios');
    }
    const existing = await this.getByIdOrThrow(id);

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No se puede asignar el rol super administrador desde la API',
      );
    }

    if (actor.id === existing.id) {
      if (dto.role !== undefined) {
        throw new ForbiddenException('No puede cambiar su propio rol');
      }
      if (dto.isActive === false) {
        throw new ForbiddenException('No puede desactivarse a sí mismo');
      }
    }

    const email =
      dto.email !== undefined ? dto.email.toLowerCase().trim() : undefined;
    if (email && email !== existing.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email, NOT: { id: existing.id } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    if (dto.password !== undefined && dto.password.length > 0) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      return serializeUser(existing);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return serializeUser(updated);
  }

  async removeUser(id: string, actor: JwtUserPayload) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Solo un super administrador puede eliminar usuarios');
    }
    if (actor.id === id) {
      throw new ForbiddenException('No puede eliminarse a sí mismo');
    }
    await this.getByIdOrThrow(id);
    await this.prisma.user.delete({ where: { id } });
    return { id };
  }
}
