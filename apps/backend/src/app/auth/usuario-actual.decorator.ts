import { ExecutionContext, ForbiddenException, createParamDecorator } from '@nestjs/common';
import type { RequestUsuario } from './auth.guard';

// @UsuarioActual() el usuario completo (hogarId puede ser null).
export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUsuario => {
    return ctx.switchToHttp().getRequest().usuario;
  },
);

// @HogarActual() el hogarId, lanzando 403 si el usuario todavia no
// pertenece a ninguno (le falta crear uno o aceptar una invitacion).
export const HogarActual = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const usuario: RequestUsuario = ctx.switchToHttp().getRequest().usuario;
  if (!usuario.hogarId) {
    throw new ForbiddenException('Todavia no perteneces a ningun hogar');
  }
  return usuario.hogarId;
});
