import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ObligacionesController } from './obligaciones.controller';
import { ObligacionesService } from './obligaciones.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ObligacionesController],
  providers: [ObligacionesService],
})
export class ObligacionesModule {}
