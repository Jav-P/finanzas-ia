import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { PresupuestosModule } from '../presupuestos/presupuestos.module';
import { CategoriasModule } from '../categorias/categorias.module';
import { AnalisisController } from './analisis.controller';
import { AnalisisService } from './analisis.service';

@Module({
  imports: [BalanceModule, PresupuestosModule, CategoriasModule],
  controllers: [AnalisisController],
  providers: [AnalisisService],
})
export class AnalisisModule {}
