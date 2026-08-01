import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { BalanceService } from './balance.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balance: BalanceService) {}

  @Get()
  calcular(@Query('hogarId') hogarId?: string, @Query('periodo') periodo?: string) {
    if (!hogarId || !periodo) {
      throw new BadRequestException('hogarId y periodo (YYYY-MM) son requeridos');
    }
    return this.balance.calcular(hogarId, periodo);
  }
}
