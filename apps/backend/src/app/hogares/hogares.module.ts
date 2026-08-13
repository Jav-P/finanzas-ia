import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { HogaresController } from './hogares.controller';
import { HogaresService } from './hogares.service';

@Module({
  imports: [SupabaseModule],
  controllers: [HogaresController],
  providers: [HogaresService],
  exports: [HogaresService],
})
export class HogaresModule {}
