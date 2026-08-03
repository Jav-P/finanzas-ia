import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { CreateLugarDto, UpdateLugarDto } from '@finanzas-ia/shared-types';
import { LugaresService } from './lugares.service';

@Controller('lugares')
export class LugaresController {
  constructor(private readonly lugares: LugaresService) {}

  @Get()
  findAll(@Query('hogarId') hogarId?: string) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.lugares.findByHogar(hogarId);
  }

  @Post()
  create(@Body() dto: CreateLugarDto) {
    if (!dto.hogarId || !dto.nombre) {
      throw new BadRequestException('hogarId y nombre son requeridos');
    }
    return this.lugares.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLugarDto) {
    return this.lugares.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lugares.remove(id);
  }
}
