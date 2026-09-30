import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { ObligacionesController } from './obligaciones.controller';
import { ObligacionesService } from './obligaciones.service';
import { InstanciasSchedulerService } from './instancias-scheduler.service';

@Module({
  imports: [SupabaseModule, CuentasModule],
  controllers: [ObligacionesController],
  providers: [ObligacionesService, InstanciasSchedulerService],
  exports: [ObligacionesService],
})
export class ObligacionesModule {}
