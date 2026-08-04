import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { CreatePresupuestoDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { PresupuestosService } from './presupuestos.service';

@Controller('presupuestos')
export class PresupuestosController {
  constructor(private readonly presupuestos: PresupuestosService) {}

  @Get()
  findAll(@HogarActual() hogarId: string, @Query('periodo') periodo?: string) {
    if (!periodo) {
      throw new BadRequestException('periodo (YYYY-MM) es requerido');
    }
    return this.presupuestos.findByHogarYPeriodo(hogarId, periodo);
  }

  @Get('resumen')
  resumen(@HogarActual() hogarId: string, @Query('periodo') periodo?: string) {
    if (!periodo) {
      throw new BadRequestException('periodo (YYYY-MM) es requerido');
    }
    return this.presupuestos.resumen(hogarId, periodo);
  }

  @Post()
  upsert(@HogarActual() hogarId: string, @Body() dto: CreatePresupuestoDto) {
    if (!dto.categoriaId || !dto.periodo || dto.montoPresupuestado == null) {
      throw new BadRequestException('categoriaId, periodo y montoPresupuestado son requeridos');
    }
    return this.presupuestos.upsert(hogarId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.presupuestos.remove(id);
  }
}
