import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePhoneModelDto } from './dto/create-phone-model.dto';
import { QueryPhoneModelDto } from './dto/query-phone-model.dto';
import { UpdatePhoneModelDto } from './dto/update-phone-model.dto';
import { PhoneModelsService } from './phone-models.service';

@Controller('phone-models')
export class PhoneModelsController {
  constructor(private readonly phoneModelsService: PhoneModelsService) {}

  @Get()
  @Message('Modelos de teléfono obtenidos')
  findAll(@Query() query: QueryPhoneModelDto) {
    return this.phoneModelsService.findAll(query);
  }

  @Get(':id')
  @Message('Modelo de teléfono obtenido')
  findOne(@Param('id') id: string) {
    return this.phoneModelsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Modelo de teléfono creado correctamente')
  create(@Body() dto: CreatePhoneModelDto) {
    return this.phoneModelsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Modelo de teléfono actualizado correctamente')
  update(@Param('id') id: string, @Body() dto: UpdatePhoneModelDto) {
    return this.phoneModelsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Modelo de teléfono eliminado correctamente')
  remove(@Param('id') id: string) {
    return this.phoneModelsService.remove(id);
  }
}
