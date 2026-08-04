import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface RequestUsuario {
  id: string; // coincide con auth.users.id
  email: string;
  hogarId: string | null;
  nombre: string | null;
}

// Guard global: valida el JWT de Supabase Auth contra GoTrue y adjunta
// el usuario (fila de nuestra tabla `usuarios`, si ya existe) al
// request. De aca en adelante hogarId/usuarioId salen SIEMPRE de aca,
// nunca de un query param o body que mande el cliente.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Falta el token de autenticacion');

    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Sesion invalida o expirada');

    const { data: usuarioRow } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const usuario: RequestUsuario = usuarioRow
      ? {
          id: usuarioRow.id,
          email: usuarioRow.email,
          hogarId: usuarioRow.hogar_id,
          nombre: usuarioRow.nombre,
        }
      : { id: data.user.id, email: data.user.email ?? '', hogarId: null, nombre: null };

    request.usuario = usuario;
    return true;
  }
}
