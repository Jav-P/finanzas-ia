import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { CreateIngresoDto, UpdateIngresoDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { IngresosService } from './ingresos.service';

@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresos: IngresosService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.ingresos.findByHogar(hogarId);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateIngresoDto) {
    if (!dto.usuarioId || !dto.descripcion || !dto.monto || !dto.periodicidad || !dto.fechaInicio) {
      throw new BadRequestException(
        'usuarioId, descripcion, monto, periodicidad y fechaInicio son requeridos',
      );
    }
    return this.ingresos.create(hogarId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIngresoDto) {
    return this.ingresos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingresos.remove(id);
  }
}
