import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { CreateGastoDto, UpdateGastoDto } from '@finanzas-ia/shared-types';
import { HogarActual, UsuarioActual } from '../auth/usuario-actual.decorator';
import type { RequestUsuario } from '../auth/auth.guard';
import { GastosService } from './gastos.service';

@Controller('gastos')
export class GastosController {
  constructor(private readonly gastos: GastosService) {}

  @Get()
  findAll(
    @HogarActual() hogarId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.gastos.findByHogar(hogarId, desde, hasta);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gastos.findOne(id);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateGastoDto) {
    if (!dto.usuarioId || !dto.categoriaId || !dto.descripcion || !dto.montoTotal || !dto.fecha) {
      throw new BadRequestException(
        'usuarioId, categoriaId, descripcion, montoTotal y fecha son requeridos',
      );
    }
    return this.gastos.create(hogarId, dto);
  }

  // Flujo rapido ("Subir pago" en el dashboard): un solo monto + su
  // comprobante, sin desglose de productos. El usuario que lo sube es
  // siempre el usuario autenticado (no se manda desde el front).
  @Post('rapido')
  @UseInterceptors(FileInterceptor('comprobante'))
  crearRapido(
    @HogarActual() hogarId: string,
    @UsuarioActual() usuario: RequestUsuario,
    @Body() body: { categoriaId?: string; montoTotal?: string; fecha?: string; descripcion?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('El comprobante (archivo) es requerido');

    const montoTotal = Number(body.montoTotal);
    if (!body.categoriaId || !body.fecha || !montoTotal || Number.isNaN(montoTotal)) {
      throw new BadRequestException('categoriaId, montoTotal y fecha son requeridos');
    }

    return this.gastos.crearRapido(
      hogarId,
      {
        usuarioId: usuario.id,
        categoriaId: body.categoriaId,
        montoTotal,
        fecha: body.fecha,
        descripcion: body.descripcion?.trim() || 'Gasto rápido',
      },
      file,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGastoDto) {
    return this.gastos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gastos.remove(id);
  }
}
