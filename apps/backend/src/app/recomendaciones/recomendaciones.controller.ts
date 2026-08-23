import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { RecomendacionesService } from './recomendaciones.service';

@Controller('recomendaciones')
export class RecomendacionesController {
  constructor(private readonly recomendaciones: RecomendacionesService) {}

  @Get()
  generar(@HogarActual() hogarId: string, @Query('periodo') periodo?: string) {
    if (!periodo) {
      throw new BadRequestException('periodo (YYYY-MM) es requerido');
    }
    return this.recomendaciones.generar(hogarId, periodo);
  }
}
