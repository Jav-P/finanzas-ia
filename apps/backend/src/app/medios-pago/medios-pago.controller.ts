import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { CreateMedioPagoDto, UpdateMedioPagoDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { MediosPagoService } from './medios-pago.service';

@Controller('medios-pago')
export class MediosPagoController {
  constructor(private readonly mediosPago: MediosPagoService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.mediosPago.findByHogar(hogarId);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateMedioPagoDto) {
    if (!dto.nombre || !dto.tipo) {
      throw new BadRequestException('nombre y tipo son requeridos');
    }
    return this.mediosPago.create(hogarId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMedioPagoDto) {
    return this.mediosPago.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediosPago.remove(id);
  }
}
