import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';

@Module({
  imports: [SupabaseModule],
  controllers: [GastosController],
  providers: [GastosService],
})
export class GastosModule {}
