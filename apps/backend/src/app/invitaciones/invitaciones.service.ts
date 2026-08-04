import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Invitacion, InvitacionCreada, InvitacionPublica } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { HogaresService } from '../hogares/hogares.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from '../mail/mail.service';
import { throwIfError } from '../common/throw-if-error';

function toInvitacion(row: any): Invitacion {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    token: row.token,
    email: row.email,
    estado: row.estado,
    invitadoPor: row.invitado_por,
    createdAt: row.created_at,
  };
}

@Injectable()
export class InvitacionesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly hogares: HogaresService,
    private readonly usuarios: UsuariosService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async crear(hogarId: string, invitadoPor: string, email?: string): Promise<InvitacionCreada> {
    const { data, error } = await this.supabase.client
      .from('invitaciones')
      .insert({ hogar_id: hogarId, invitado_por: invitadoPor, email: email ?? null })
      .select()
      .single();
    throwIfError(error);

    const invitacion = toInvitacion(data);
    const link = `${this.config.getOrThrow<string>('FRONTEND_URL')}/registro?invitacion=${invitacion.token}`;

    let emailEnviado = false;
    if (email) {
      const hogar = await this.hogares.findOne(hogarId);
      emailEnviado = await this.mail.enviarInvitacion(email, hogar.nombre, link);
    }

    return { ...invitacion, link, emailEnviado };
  }

  async obtenerPublica(token: string): Promise<InvitacionPublica> {
    const invitacion = await this.obtenerPorToken(token);
    const hogar = await this.hogares.findOne(invitacion.hogarId);
    return { hogarNombre: hogar.nombre, email: invitacion.email, estado: invitacion.estado };
  }

  async obtenerPorToken(token: string): Promise<Invitacion> {
    const { data, error } = await this.supabase.client
      .from('invitaciones')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new NotFoundException('Invitacion no encontrada');
    return toInvitacion(data);
  }

  async aceptar(usuarioId: string, usuarioEmail: string, token: string): Promise<void> {
    const invitacion = await this.obtenerPorToken(token);
    if (invitacion.estado !== 'pendiente') {
      throw new BadRequestException('Esta invitacion ya no esta disponible');
    }
    if (invitacion.email && invitacion.email.toLowerCase() !== usuarioEmail.toLowerCase()) {
      throw new ForbiddenException('Esta invitacion es para otro correo');
    }

    await this.usuarios.setHogar(usuarioId, invitacion.hogarId);

    const { error } = await this.supabase.client
      .from('invitaciones')
      .update({ estado: 'aceptada' })
      .eq('id', invitacion.id);
    throwIfError(error);
  }

  async rechazar(token: string): Promise<void> {
    const invitacion = await this.obtenerPorToken(token);
    if (invitacion.estado !== 'pendiente') {
      throw new BadRequestException('Esta invitacion ya no esta disponible');
    }

    const { error } = await this.supabase.client
      .from('invitaciones')
      .update({ estado: 'rechazada' })
      .eq('id', invitacion.id);
    throwIfError(error);
  }
}
