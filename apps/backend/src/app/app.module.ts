import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ObligacionesModule } from './obligaciones/obligaciones.module';
import { InstanciasModule } from './instancias/instancias.module';
import { IngresosModule } from './ingresos/ingresos.module';
import { BalanceModule } from './balance/balance.module';
import { PresupuestosModule } from './presupuestos/presupuestos.module';
import { MediosPagoModule } from './medios-pago/medios-pago.module';
import { LugaresModule } from './lugares/lugares.module';
import { ProductosModule } from './productos/productos.module';
import { GastosModule } from './gastos/gastos.module';
import { OcrModule } from './ocr/ocr.module';
import { AuthModule } from './auth/auth.module';
import { HogaresModule } from './hogares/hogares.module';
import { InvitacionesModule } from './invitaciones/invitaciones.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    HogaresModule,
    InvitacionesModule,
    MailModule,
    UsuariosModule,
    CategoriasModule,
    ObligacionesModule,
    InstanciasModule,
    IngresosModule,
    BalanceModule,
    PresupuestosModule,
    MediosPagoModule,
    LugaresModule,
    ProductosModule,
    GastosModule,
    OcrModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
