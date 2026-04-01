import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Message } from '../../common/decorators/message.decorator';
import { RawResponse } from '../../common/decorators/raw-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Message('Inicio de sesión correcto')
  @RawResponse()
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Message('Perfil de administrador obtenido')
  @RawResponse()
  getAdminProfile(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }
}
