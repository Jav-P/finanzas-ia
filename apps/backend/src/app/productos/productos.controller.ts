import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { CreateProductoDto } from '@finanzas-ia/shared-types';
import { ProductosService } from './productos.service';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  @Get()
  findAll(@Query('hogarId') hogarId?: string) {
    if (!hogarId) {
      throw new BadRequestException('hogarId es requerido');
    }
    return this.productos.findByHogar(hogarId);
  }

  @Post()
  create(@Body() dto: CreateProductoDto) {
    if (!dto.hogarId || !dto.nombre) {
      throw new BadRequestException('hogarId y nombre son requeridos');
    }
    return this.productos.create(dto);
  }

  @Get(':id/historico-precios')
  historicoPrecios(@Param('id') id: string) {
    return this.productos.historicoPrecios(id);
  }
}
