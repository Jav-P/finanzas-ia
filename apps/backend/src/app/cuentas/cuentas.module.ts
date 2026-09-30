import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CuentasController],
  providers: [CuentasService],
})
export class CuentasModule {}
