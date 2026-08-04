import { Controller, Get } from '@nestjs/common';
import { HogarActual, UsuarioActual } from '../auth/usuario-actual.decorator';
import type { RequestUsuario } from '../auth/auth.guard';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  findAll(@HogarActual() hogarId: string) {
    return this.usuarios.findByHogar(hogarId);
  }

  // El perfil (fila en `usuarios`) de quien esta logueado ahora mismo.
  // Devuelve null si ya tiene sesion en Supabase Auth pero todavia no
  // completo el registro (POST /auth/completar-registro).
  @Get('yo')
  yo(@UsuarioActual() usuario: RequestUsuario) {
    return this.usuarios.findOne(usuario.id);
  }
}
