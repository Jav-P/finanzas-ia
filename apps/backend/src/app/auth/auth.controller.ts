import { Body, Controller, Post } from '@nestjs/common';
import type { CompletarRegistroDto } from '@finanzas-ia/shared-types';
import { UsuarioActual } from './usuario-actual.decorator';
import type { RequestUsuario } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('completar-registro')
  completarRegistro(@UsuarioActual() usuario: RequestUsuario, @Body() dto: CompletarRegistroDto) {
    return this.auth.completarRegistro(usuario, dto);
  }
}
