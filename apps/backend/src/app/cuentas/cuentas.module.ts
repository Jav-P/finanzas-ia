import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import { CuentasSchedulerService } from './cuentas-scheduler.service';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CuentasController, MovimientosController],
  providers: [CuentasService, CuentasSchedulerService, MovimientosService],
  exports: [CuentasService, MovimientosService],
})
export class CuentasModule {}
