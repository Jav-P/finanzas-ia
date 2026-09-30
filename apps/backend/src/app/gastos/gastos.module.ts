import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';

@Module({
  imports: [SupabaseModule, CuentasModule],
  controllers: [GastosController],
  providers: [GastosService],
})
export class GastosModule {}
