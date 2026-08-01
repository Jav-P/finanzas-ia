import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

@Module({
  imports: [SupabaseModule, UsuariosModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class BalanceModule {}
