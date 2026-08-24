import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { AnalisisService } from './analisis.service';

@Controller('analisis')
export class AnalisisController {
  constructor(private readonly analisis: AnalisisService) {}

  @Get('categorias')
  categorias(@HogarActual() hogarId: string, @Query('periodo') periodo?: string) {
    if (!periodo) {
      throw new BadRequestException('periodo (YYYY-MM) es requerido');
    }
    return this.analisis.categorias_(hogarId, periodo);
  }
}
