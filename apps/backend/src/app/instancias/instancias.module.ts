import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { InstanciasController } from './instancias.controller';
import { InstanciasService } from './instancias.service';

@Module({
  imports: [SupabaseModule, CuentasModule],
  controllers: [InstanciasController],
  providers: [InstanciasService],
})
export class InstanciasModule {}
