import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import type { CompletarRegistroDto, CredencialesDto, RefrescarSesionDto } from '@finanzas-ia/shared-types';
import { UsuarioActual } from './usuario-actual.decorator';
import type { RequestUsuario } from './auth.guard';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: CredencialesDto) {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('email y password son requeridos');
    }
    return this.auth.signup(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  login(@Body() dto: CredencialesDto) {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('email y password son requeridos');
    }
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refrescar')
  refrescar(@Body() dto: RefrescarSesionDto) {
    if (!dto.refreshToken) {
      throw new BadRequestException('refreshToken es requerido');
    }
    return this.auth.refrescar(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  async logout(@Body() dto: { accessToken?: string }) {
    await this.auth.logout(dto.accessToken);
  }

  @Post('completar-registro')
  completarRegistro(@UsuarioActual() usuario: RequestUsuario, @Body() dto: CompletarRegistroDto) {
    return this.auth.completarRegistro(usuario, dto);
  }
}
