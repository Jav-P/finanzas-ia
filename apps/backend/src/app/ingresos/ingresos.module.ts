import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { IngresosController } from './ingresos.controller';
import { IngresosService } from './ingresos.service';

@Module({
  imports: [SupabaseModule],
  controllers: [IngresosController],
  providers: [IngresosService],
  exports: [IngresosService],
})
export class IngresosModule {}
