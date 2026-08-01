import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { MediosPagoController } from './medios-pago.controller';
import { MediosPagoService } from './medios-pago.service';

@Module({
  imports: [SupabaseModule],
  controllers: [MediosPagoController],
  providers: [MediosPagoService],
})
export class MediosPagoModule {}
