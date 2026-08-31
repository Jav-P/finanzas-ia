import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Session } from '@supabase/supabase-js';
import type {
  CompletarRegistroDto,
  CompletarRegistroResultado,
  SesionAuth,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { HogaresService } from '../hogares/hogares.service';
import { InvitacionesService } from '../invitaciones/invitaciones.service';
import type { RequestUsuario } from './auth.guard';

function toSesionAuth(session: Session): SesionAuth {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usuarios: UsuariosService,
    private readonly hogares: HogaresService,
    private readonly invitaciones: InvitacionesService,
  ) {}

  async signup(email: string, password: string): Promise<SesionAuth> {
    const { data, error } = await this.supabase.authClient.auth.signUp({ email, password });
    if (error) throw new BadRequestException(error.message);
    if (data.session) return toSesionAuth(data.session);

    // Sin sesion significa que el proyecto de Supabase exige confirmar
    // el correo antes de poder iniciar sesion. Como la app no tiene un
    // SMTP propio configurado para enviar ese correo, confirmamos el
    // usuario nosotros mismos (con la key de servicio, que tiene
    // permisos de administrador) e iniciamos sesion de inmediato.
    if (!data.user) {
      throw new BadRequestException('No se pudo registrar el usuario');
    }
    const { error: errorConfirmar } = await this.supabase.client.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });
    if (errorConfirmar) throw new BadRequestException(errorConfirmar.message);

    return this.login(email, password);
  }

  async login(email: string, password: string): Promise<SesionAuth> {
    const { data, error } = await this.supabase.authClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new UnauthorizedException('Correo o contraseña incorrectos');
    return toSesionAuth(data.session);
  }

  async refrescar(refreshToken: string): Promise<SesionAuth> {
    const { data, error } = await this.supabase.authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) throw new UnauthorizedException('No se pudo renovar la sesion');
    return toSesionAuth(data.session);
  }

  // Revoca el token en GoTrue (mejor esfuerzo: si falla, el front igual
  // borra la sesion local, asi que no hace falta relanzar el error).
  async logout(accessToken?: string): Promise<void> {
    if (!accessToken) return;
    try {
      await this.supabase.client.auth.admin.signOut(accessToken);
    } catch (error) {
      this.logger.warn('No se pudo revocar el token en logout', error instanceof Error ? error.stack : error);
    }
  }

  async completarRegistro(
    usuarioActual: RequestUsuario,
    dto: CompletarRegistroDto,
  ): Promise<CompletarRegistroResultado> {
    const existente = await this.usuarios.findOne(usuarioActual.id);
    if (existente) {
      throw new BadRequestException('Ya completaste tu registro');
    }
    if (!dto.nombre) {
      throw new BadRequestException('nombre es requerido');
    }

    if (dto.invitacionToken) {
      // Solo valida que la invitacion exista; el hogar se asigna recien
      // cuando la persona la acepta explicitamente (pantalla aparte).
      await this.invitaciones.obtenerPorToken(dto.invitacionToken);
      const usuario = await this.usuarios.create(
        usuarioActual.id,
        usuarioActual.email,
        dto.nombre,
        null,
      );
      return { usuario, hogar: null };
    }

    if (!dto.nombreHogar) {
      throw new BadRequestException('nombreHogar es requerido si no vienes de una invitacion');
    }
    const hogar = await this.hogares.create(dto.nombreHogar);
    const usuario = await this.usuarios.create(usuarioActual.id, usuarioActual.email, dto.nombre, hogar.id);
    return { usuario, hogar };
  }
}
