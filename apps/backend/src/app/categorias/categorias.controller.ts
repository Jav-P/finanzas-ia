import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateCategoriaDto } from '@finanzas-ia/shared-types';
import { CategoriasService } from './categorias.service';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Get()
  findAll(@Query('hogarId') hogarId?: string) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.categorias.findByHogar(hogarId);
  }

  @Post()
  create(@Body() dto: CreateCategoriaDto) {
    if (!dto.hogarId || !dto.nombre) {
      throw new BadRequestException('hogarId y nombre son requeridos');
    }
    return this.categorias.create(dto);
  }
}
