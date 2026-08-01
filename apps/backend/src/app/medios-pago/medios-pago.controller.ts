import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateMedioPagoDto } from '@finanzas-ia/shared-types';
import { MediosPagoService } from './medios-pago.service';

@Controller('medios-pago')
export class MediosPagoController {
  constructor(private readonly mediosPago: MediosPagoService) {}

  @Get()
  findAll(@Query('hogarId') hogarId?: string) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.mediosPago.findByHogar(hogarId);
  }

  @Post()
  create(@Body() dto: CreateMedioPagoDto) {
    if (!dto.hogarId || !dto.nombre || !dto.tipo) {
      throw new BadRequestException('hogarId, nombre y tipo son requeridos');
    }
    return this.mediosPago.create(dto);
  }
}
