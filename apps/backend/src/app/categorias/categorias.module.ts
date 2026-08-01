import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CategoriasController],
  providers: [CategoriasService],
})
export class CategoriasModule {}
