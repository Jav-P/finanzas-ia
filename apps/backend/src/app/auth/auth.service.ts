import { BadRequestException, Injectable } from '@nestjs/common';
import type { CompletarRegistroDto, CompletarRegistroResultado } from '@finanzas-ia/shared-types';
import { UsuariosService } from '../usuarios/usuarios.service';
import { HogaresService } from '../hogares/hogares.service';
import { InvitacionesService } from '../invitaciones/invitaciones.service';
import type { RequestUsuario } from './auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly hogares: HogaresService,
    private readonly invitaciones: InvitacionesService,
  ) {}

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
