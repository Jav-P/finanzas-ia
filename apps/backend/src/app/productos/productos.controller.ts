import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { CreateProductoDto, UpdateProductoDto } from '@finanzas-ia/shared-types';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { ProductosService } from './productos.service';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.productos.findByHogar(hogarId);
  }

  @Post()
  create(@HogarActual() hogarId: string, @Body() dto: CreateProductoDto) {
    if (!dto.nombre) {
      throw new BadRequestException('nombre es requerido');
    }
    return this.productos.create(hogarId, dto);
  }

  @Get(':id/historico-precios')
  historicoPrecios(@Param('id') id: string) {
    return this.productos.historicoPrecios(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productos.remove(id);
  }
}
