import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateIngresoDto } from '@finanzas-ia/shared-types';
import { IngresosService } from './ingresos.service';

@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresos: IngresosService) {}

  @Get()
  findAll(@Query('hogarId') hogarId?: string) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.ingresos.findByHogar(hogarId);
  }

  @Post()
  create(@Body() dto: CreateIngresoDto) {
    if (!dto.hogarId || !dto.usuarioId || !dto.descripcion || !dto.monto || !dto.periodicidad || !dto.fechaInicio) {
      throw new BadRequestException(
        'hogarId, usuarioId, descripcion, monto, periodicidad y fechaInicio son requeridos',
      );
    }
    return this.ingresos.create(dto);
  }
}
