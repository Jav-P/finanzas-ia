import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { BalanceService } from './balance.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balance: BalanceService) {}

  @Get()
  calcular(@HogarActual() hogarId: string, @Query('periodo') periodo?: string) {
    if (!periodo) {
      throw new BadRequestException('periodo (YYYY-MM) es requerido');
    }
    return this.balance.calcular(hogarId, periodo);
  }
}
