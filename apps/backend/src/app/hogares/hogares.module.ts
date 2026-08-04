import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { HogaresService } from './hogares.service';

@Module({
  imports: [SupabaseModule],
  providers: [HogaresService],
  exports: [HogaresService],
})
export class HogaresModule {}
