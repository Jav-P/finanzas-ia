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
import type {
  CreateObligacionDto,
  UpdateObligacionDto,
} from '@finanzas-ia/shared-types';
import { ObligacionesService } from './obligaciones.service';

@Controller('obligaciones')
export class ObligacionesController {
  constructor(private readonly obligaciones: ObligacionesService) {}

  @Post()
  create(@Body() dto: CreateObligacionDto) {
    if (!dto.hogarId || !dto.categoriaId || !dto.descripcion || !dto.monto || !dto.recurrencia || !dto.fechaInicio) {
      throw new BadRequestException(
        'hogarId, categoriaId, descripcion, monto, recurrencia y fechaInicio son requeridos',
      );
    }
    return this.obligaciones.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.obligaciones.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateObligacionDto) {
    return this.obligaciones.update(id, dto);
  }

  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.obligaciones.desactivar(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.obligaciones.remove(id);
  }
}
