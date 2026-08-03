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
import { GastosService } from './gastos.service';

@Controller('gastos')
export class GastosController {
  constructor(private readonly gastos: GastosService) {}

  @Get()
  findAll(
    @Query('hogarId') hogarId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.gastos.findByHogar(hogarId, desde, hasta);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gastos.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGastoDto) {
    if (!dto.hogarId || !dto.usuarioId || !dto.categoriaId || !dto.descripcion || !dto.montoTotal || !dto.fecha) {
      throw new BadRequestException(
        'hogarId, usuarioId, categoriaId, descripcion, montoTotal y fecha son requeridos',
      );
    }
    return this.gastos.create(dto);
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
