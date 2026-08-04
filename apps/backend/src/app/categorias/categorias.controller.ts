import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { CreateCategoriaDto, UpdateCategoriaDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { CategoriasService } from './categorias.service';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.categorias.findByHogar(hogarId);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateCategoriaDto) {
    if (!dto.nombre) {
      throw new BadRequestException('nombre es requerido');
    }
    return this.categorias.create(hogarId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.categorias.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categorias.remove(id);
  }
}
