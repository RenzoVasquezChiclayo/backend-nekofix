import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../common/interfaces/jwt-user-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Message('Usuarios obtenidos')
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAllForAdmin(query);
  }

  @Get(':id')
  @Message('Usuario obtenido')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOneSerialized(id);
  }

  @Post()
  @Message('Usuario creado correctamente')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: JwtUserPayload,
  ) {
    return this.usersService.createUser(dto, actor);
  }

  @Patch(':id')
  @Message('Usuario actualizado correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtUserPayload,
  ) {
    return this.usersService.updateUser(id, dto, actor);
  }

  @Delete(':id')
  @Message('Usuario eliminado correctamente')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUserPayload,
  ) {
    return this.usersService.removeUser(id, actor);
  }
}
