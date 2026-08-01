import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ObligacionesModule } from './obligaciones/obligaciones.module';
import { InstanciasModule } from './instancias/instancias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    UsuariosModule,
    CategoriasModule,
    ObligacionesModule,
    InstanciasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
