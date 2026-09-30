import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import { CuentasSchedulerService } from './cuentas-scheduler.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CuentasController],
  providers: [CuentasService, CuentasSchedulerService],
  exports: [CuentasService],
})
export class CuentasModule {}
