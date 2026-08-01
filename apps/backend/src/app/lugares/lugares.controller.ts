import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateLugarDto } from '@finanzas-ia/shared-types';
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
}
