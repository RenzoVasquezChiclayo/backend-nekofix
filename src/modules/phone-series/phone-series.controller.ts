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
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePhoneSeriesDto } from './dto/create-phone-series.dto';
import { QueryPhoneSeriesDto } from './dto/query-phone-series.dto';
import { UpdatePhoneSeriesDto } from './dto/update-phone-series.dto';
import { PhoneSeriesService } from './phone-series.service';

@Controller('phone-series')
export class PhoneSeriesController {
  constructor(private readonly phoneSeriesService: PhoneSeriesService) {}

  @Get()
  @Message('Series obtenidas')
  findAll(@Query() query: QueryPhoneSeriesDto) {
    return this.phoneSeriesService.findAll(query);
  }

  @Get(':id')
  @Message('Serie obtenida')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.phoneSeriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Serie creada correctamente')
  create(@Body() dto: CreatePhoneSeriesDto) {
    return this.phoneSeriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Serie actualizada correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhoneSeriesDto,
  ) {
    return this.phoneSeriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Serie eliminada correctamente')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.phoneSeriesService.remove(id);
  }
}
