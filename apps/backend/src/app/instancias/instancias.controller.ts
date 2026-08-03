import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { EstadoInstancia, RegistrarPagoDto } from '@finanzas-ia/shared-types';
import { InstanciasService } from './instancias.service';

@Controller('instancias')
export class InstanciasController {
  constructor(private readonly instancias: InstanciasService) {}

  @Get()
  findAll(
    @Query('hogarId') hogarId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('estado') estado?: EstadoInstancia,
  ) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.instancias.findAll(hogarId, usuarioId, estado);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.instancias.findOne(id);
  }

  @Post(':id/pago')
  @UseInterceptors(FileInterceptor('comprobante'))
  registrarPago(
    @Param('id') id: string,
    @Body() dto: RegistrarPagoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('El comprobante (archivo) es requerido');
    }
    if (!dto.usuarioPagoId || !dto.fechaPago || !dto.montoPagado) {
      throw new BadRequestException('usuarioPagoId, fechaPago y montoPagado son requeridos');
    }
    return this.instancias.registrarPago(id, dto, file);
  }

  @Delete(':id/pago')
  revertirPago(@Param('id') id: string) {
    return this.instancias.revertirPago(id);
  }
}
