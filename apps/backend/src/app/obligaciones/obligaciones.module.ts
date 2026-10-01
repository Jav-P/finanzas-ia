import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { MailModule } from '../mail/mail.module';
import { ObligacionesController } from './obligaciones.controller';
import { ObligacionesService } from './obligaciones.service';
import { InstanciasSchedulerService } from './instancias-scheduler.service';
import { RecordatoriosService } from './recordatorios.service';

@Module({
  imports: [SupabaseModule, CuentasModule, UsuariosModule, MailModule],
  controllers: [ObligacionesController],
  providers: [ObligacionesService, InstanciasSchedulerService, RecordatoriosService],
  exports: [ObligacionesService],
})
export class ObligacionesModule {}
