import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { CreateCuentaDto, UpdateCuentaDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { CuentasService } from './cuentas.service';

const TIPOS = ['efectivo', 'ahorros', 'bolsillo', 'tarjeta_credito', 'inversion'];

@Controller('cuentas')
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.cuentas.findByHogar(hogarId);
  }

  @Get('patrimonio')
  patrimonio(@HogarActual() hogarId: string) {
    return this.cuentas.patrimonio(hogarId);
  }

  @Get('patrimonio/historico')
  historico(@HogarActual() hogarId: string) {
    return this.cuentas.historico(hogarId);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateCuentaDto) {
    if (!dto.nombre || !TIPOS.includes(dto.tipo)) {
      throw new BadRequestException('nombre y un tipo valido son requeridos');
    }
    return this.cuentas.create(hogarId, dto);
  }

  @Patch(':id')
  update(@HogarActual() hogarId: string, @Param('id') id: string, @Body() dto: UpdateCuentaDto) {
    return this.cuentas.update(hogarId, id, dto);
  }

  @Delete(':id')
  remove(@HogarActual() hogarId: string, @Param('id') id: string) {
    return this.cuentas.remove(hogarId, id);
  }
}
