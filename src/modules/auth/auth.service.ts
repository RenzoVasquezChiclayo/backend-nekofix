import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import { JwtPayload } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const result = await this.usersService.validateAdminCredentials(
      dto.email,
      dto.password,
    );
    if (!result) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const { user } = result;
    const token = await this.signToken(user);
    const expiresIn = this.resolveTokenExpirySeconds();
    return {
      accessToken: token,
      refreshToken: null,
      expiresIn,
      user: this.sanitizeUser(user),
    };
  }

  async me(userId: string) {
    const user = await this.usersService.getByIdOrThrow(userId);
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: null,
      role: this.mapRole(user.role),
    };
  }

  private mapRole(
    role: UserRole,
  ):
    | 'SUPER_ADMINISTRADOR'
    | 'ADMINISTRADOR'
    | 'CLIENTE' {
    if (role === UserRole.SUPER_ADMIN) return 'SUPER_ADMINISTRADOR';
    if (role === UserRole.ADMIN) return 'ADMINISTRADOR';
    return 'CLIENTE';
  }

  private resolveTokenExpirySeconds(): number {
    const raw = this.configService.get<string>('jwt.expiresIn') ?? '1h';
    const normalized = raw.trim().toLowerCase();
    const num = Number(normalized);
    if (!Number.isNaN(num) && num > 0) {
      return Math.floor(num);
    }
    const match = normalized.match(/^(\d+)\s*([smhd])$/);
    if (!match) {
      return 3600;
    }
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }

  private async signToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }
}
