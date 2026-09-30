import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import type { ConfirmarIngresoDto, OmitirIngresoDto, TransferenciaDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { MovimientosService } from './movimientos.service';

@Controller()
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get('movimientos')
  listar(@HogarActual() hogarId: string, @Query('cuentaId') cuentaId?: string) {
    return this.movimientos.listar(hogarId, cuentaId);
  }

  @Post('movimientos/transferencia')
  transferir(@HogarActual() hogarId: string, @Body() dto: TransferenciaDto) {
    if (!dto.cuentaOrigenId || !dto.cuentaDestinoId || !dto.monto || !dto.fecha) {
      throw new BadRequestException('cuentaOrigenId, cuentaDestinoId, monto y fecha son requeridos');
    }
    return this.movimientos.transferir(hogarId, dto);
  }

  @Delete('movimientos/:id')
  eliminar(@HogarActual() hogarId: string, @Param('id') id: string) {
    return this.movimientos.eliminar(hogarId, id);
  }

  @Get('ingresos/pendientes')
  ingresosPendientes(@HogarActual() hogarId: string) {
    return this.movimientos.ingresosPendientes(hogarId);
  }

  @Post('ingresos/confirmar')
  confirmar(@HogarActual() hogarId: string, @Body() dto: ConfirmarIngresoDto) {
    if (!dto.ingresoId || !dto.periodo || !dto.cuentaId || !dto.monto || !dto.fecha) {
      throw new BadRequestException('ingresoId, periodo, cuentaId, monto y fecha son requeridos');
    }
    return this.movimientos.confirmarIngreso(hogarId, dto);
  }

  @Post('ingresos/omitir')
  omitir(@HogarActual() hogarId: string, @Body() dto: OmitirIngresoDto) {
    if (!dto.ingresoId || !dto.periodo) {
      throw new BadRequestException('ingresoId y periodo son requeridos');
    }
    return this.movimientos.omitirIngreso(hogarId, dto);
  }
}
