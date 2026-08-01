import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreatePresupuestoDto } from '@finanzas-ia/shared-types';
import { PresupuestosService } from './presupuestos.service';

@Controller('presupuestos')
export class PresupuestosController {
  constructor(private readonly presupuestos: PresupuestosService) {}

  @Get()
  findAll(@Query('hogarId') hogarId?: string, @Query('periodo') periodo?: string) {
    if (!hogarId || !periodo) {
      throw new BadRequestException('hogarId y periodo (YYYY-MM) son requeridos');
    }
    return this.presupuestos.findByHogarYPeriodo(hogarId, periodo);
  }

  @Get('resumen')
  resumen(@Query('hogarId') hogarId?: string, @Query('periodo') periodo?: string) {
    if (!hogarId || !periodo) {
      throw new BadRequestException('hogarId y periodo (YYYY-MM) son requeridos');
    }
    return this.presupuestos.resumen(hogarId, periodo);
  }

  @Post()
  upsert(@Body() dto: CreatePresupuestoDto) {
    if (!dto.hogarId || !dto.categoriaId || !dto.periodo || dto.montoPresupuestado == null) {
      throw new BadRequestException(
        'hogarId, categoriaId, periodo y montoPresupuestado son requeridos',
      );
    }
    return this.presupuestos.upsert(dto);
  }
}
