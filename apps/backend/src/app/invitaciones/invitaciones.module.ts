import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { HogaresModule } from '../hogares/hogares.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { MailModule } from '../mail/mail.module';
import { InvitacionesController } from './invitaciones.controller';
import { InvitacionesService } from './invitaciones.service';

@Module({
  imports: [ConfigModule, SupabaseModule, HogaresModule, UsuariosModule, MailModule],
  controllers: [InvitacionesController],
  providers: [InvitacionesService],
  exports: [InvitacionesService],
})
export class InvitacionesModule {}
