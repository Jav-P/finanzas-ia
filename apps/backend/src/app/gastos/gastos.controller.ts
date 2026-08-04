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
import type { CreateGastoDto, UpdateGastoDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { GastosService } from './gastos.service';

@Controller('gastos')
export class GastosController {
  constructor(private readonly gastos: GastosService) {}

  @Get()
  findAll(
    @HogarActual() hogarId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.gastos.findByHogar(hogarId, desde, hasta);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gastos.findOne(id);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateGastoDto) {
    if (!dto.usuarioId || !dto.categoriaId || !dto.descripcion || !dto.montoTotal || !dto.fecha) {
      throw new BadRequestException(
        'usuarioId, categoriaId, descripcion, montoTotal y fecha son requeridos',
      );
    }
    return this.gastos.create(hogarId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGastoDto) {
    return this.gastos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gastos.remove(id);
  }
}
