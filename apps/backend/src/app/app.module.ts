import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { RecomendacionesModule } from './recomendaciones/recomendaciones.module';
import { AnalisisModule } from './analisis/analisis.module';
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
    // Sirve el Angular ya compilado (copiado a dist/apps/backend/frontend
    // durante el build de despliegue) para las rutas que no son /api, con
    // fallback de SPA. En dev esta carpeta no existe y el modulo simplemente
    // no encuentra nada que servir (el front corre aparte con `nx serve`).
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'frontend'),
      exclude: ['/api/{*splat}'],
    }),
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
    RecomendacionesModule,
    AnalisisModule,
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
