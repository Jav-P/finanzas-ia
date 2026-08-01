import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { InstanciasController } from './instancias.controller';
import { InstanciasService } from './instancias.service';

@Module({
  imports: [SupabaseModule],
  controllers: [InstanciasController],
  providers: [InstanciasService],
})
export class InstanciasModule {}
