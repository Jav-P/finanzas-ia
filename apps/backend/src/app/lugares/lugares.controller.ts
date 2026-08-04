import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { CreateLugarDto, UpdateLugarDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { LugaresService } from './lugares.service';

@Controller('lugares')
export class LugaresController {
  constructor(private readonly lugares: LugaresService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.lugares.findByHogar(hogarId);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateLugarDto) {
    if (!dto.nombre) {
      throw new BadRequestException('nombre es requerido');
    }
    return this.lugares.create(hogarId, dto);
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
