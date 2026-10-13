import { Module } from '@nestjs/common';
import { ObligacionesModule } from '../obligaciones/obligaciones.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { CronController } from './cron.controller';

@Module({
  imports: [ObligacionesModule, CuentasModule],
  controllers: [CronController],
})
export class CronModule {}
