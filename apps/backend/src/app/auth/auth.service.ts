import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import type {
  CambiarPasswordDto,
  CompletarRegistroDto,
  CompletarRegistroResultado,
  RestablecerPasswordDto,
  SesionAuth,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { HogaresService } from '../hogares/hogares.service';
import { InvitacionesService } from '../invitaciones/invitaciones.service';
import { MailService } from '../mail/mail.service';
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
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // Se crea el usuario por la via de administrador (con la key de
  // servicio) en vez del signUp publico: asi queda confirmado desde
  // el inicio y Supabase nunca intenta mandar un correo de
  // confirmacion (el proyecto no tiene SMTP propio, y ese correo
  // tampoco hace falta para una app de uso privado como esta).
  async signup(email: string, password: string): Promise<SesionAuth> {
    const { data, error } = await this.supabase.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new BadRequestException(error.message);
    if (!data.user) {
      throw new BadRequestException('No se pudo registrar el usuario');
    }

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

  // No depende de correo: se verifica la contraseña actual contra
  // GoTrue (login real, sin crear sesion nueva de cara al cliente) y,
  // si es correcta, se sobreescribe con la key de servicio.
  async cambiarPassword(usuarioActual: RequestUsuario, dto: CambiarPasswordDto): Promise<void> {
    const { error: errorLogin } = await this.supabase.authClient.auth.signInWithPassword({
      email: usuarioActual.email,
      password: dto.passwordActual,
    });
    if (errorLogin) throw new UnauthorizedException('La contraseña actual no es correcta');

    const { error } = await this.supabase.client.auth.admin.updateUserById(usuarioActual.id, {
      password: dto.passwordNueva,
    });
    if (error) throw new BadRequestException(error.message);
  }

  // "Olvide mi contraseña": nunca revela si el correo existe o no (el
  // controller siempre responde igual). Se usa generateLink en vez de
  // la invitacion/recovery automatica de Supabase porque el front
  // nunca habla con Supabase directo: el link que mandamos por correo
  // apunta a nuestra propia pantalla, con el hashed_token como parametro.
  async olvidePassword(email: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    if (error || !data.properties?.hashed_token) {
      this.logger.warn(`No se genero link de recuperacion para ${email}: ${error?.message ?? 'sin hashed_token'}`);
      return;
    }

    const link = `${this.config.getOrThrow<string>('FRONTEND_URL')}/restablecer-password?token=${data.properties.hashed_token}`;
    await this.mail.enviarRecuperacion(email, link);
  }

  // El hashed_token generado arriba se valida aca con verifyOtp (lo
  // revisa Supabase: expiracion, que no se haya usado ya, etc.). Si es
  // valido, se sobreescribe la contraseña con la key de servicio, igual
  // que en cambiarPassword.
  async restablecerPassword(dto: RestablecerPasswordDto): Promise<void> {
    const { data, error } = await this.supabase.authClient.auth.verifyOtp({
      token_hash: dto.token,
      type: 'recovery',
    });
    if (error || !data.user) {
      throw new BadRequestException('El enlace no es válido o ya expiró. Pide uno nuevo.');
    }

    const { error: errorUpdate } = await this.supabase.client.auth.admin.updateUserById(data.user.id, {
      password: dto.passwordNueva,
    });
    if (errorUpdate) throw new BadRequestException(errorUpdate.message);
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
