import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CreateInvitacionDto } from '@finanzas-ia/shared-types';
import { Public } from '../auth/public.decorator';
import { HogarActual, UsuarioActual } from '../auth/usuario-actual.decorator';
import type { RequestUsuario } from '../auth/auth.guard';
import { InvitacionesService } from './invitaciones.service';

@Controller('invitaciones')
export class InvitacionesController {
  constructor(private readonly invitaciones: InvitacionesService) {}

  @Post()
  crear(@HogarActual() hogarId: string, @UsuarioActual() usuario: RequestUsuario, @Body() dto: CreateInvitacionDto) {
    return this.invitaciones.crear(hogarId, usuario.id, dto.email);
  }

  @Public()
  @Get(':token')
  obtenerPublica(@Param('token') token: string) {
    return this.invitaciones.obtenerPublica(token);
  }

  @Post(':token/aceptar')
  aceptar(@UsuarioActual() usuario: RequestUsuario, @Param('token') token: string) {
    return this.invitaciones.aceptar(usuario.id, usuario.email, token);
  }

  @Post(':token/rechazar')
  rechazar(@Param('token') token: string) {
    return this.invitaciones.rechazar(token);
  }
}
