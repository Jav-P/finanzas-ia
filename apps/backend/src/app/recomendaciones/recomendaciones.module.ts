import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { PresupuestosModule } from '../presupuestos/presupuestos.module';
import { ObligacionesModule } from '../obligaciones/obligaciones.module';
import { RecomendacionesController } from './recomendaciones.controller';
import { RecomendacionesService } from './recomendaciones.service';

@Module({
  imports: [BalanceModule, PresupuestosModule, ObligacionesModule],
  controllers: [RecomendacionesController],
  providers: [RecomendacionesService],
})
export class RecomendacionesModule {}
