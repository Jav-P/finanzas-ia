import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { MailModule } from '../mail/mail.module';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import { CuentasSchedulerService } from './cuentas-scheduler.service';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { TasasCambioService } from './tasas-cambio.service';
import { TarjetasService } from './tarjetas.service';
import { TarjetaRecordatoriosService } from './tarjeta-recordatorios.service';

@Module({
  imports: [SupabaseModule, UsuariosModule, MailModule],
  controllers: [CuentasController, MovimientosController],
  providers: [
    CuentasService,
    CuentasSchedulerService,
    MovimientosService,
    TasasCambioService,
    TarjetasService,
    TarjetaRecordatoriosService,
  ],
  exports: [CuentasService, MovimientosService],
})
export class CuentasModule {}
