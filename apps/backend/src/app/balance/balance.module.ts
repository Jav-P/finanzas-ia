import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PresupuestosModule } from '../presupuestos/presupuestos.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

@Module({
  imports: [SupabaseModule, UsuariosModule, PresupuestosModule],
  controllers: [BalanceController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
