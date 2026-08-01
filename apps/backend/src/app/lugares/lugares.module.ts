import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { LugaresController } from './lugares.controller';
import { LugaresService } from './lugares.service';

@Module({
  imports: [SupabaseModule],
  controllers: [LugaresController],
  providers: [LugaresService],
  exports: [LugaresService],
})
export class LugaresModule {}
