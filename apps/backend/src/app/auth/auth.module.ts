import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { HogaresModule } from '../hogares/hogares.module';
import { InvitacionesModule } from '../invitaciones/invitaciones.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [SupabaseModule, UsuariosModule, HogaresModule, InvitacionesModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
