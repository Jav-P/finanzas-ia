import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CuentasService } from './cuentas.service';
import { TasasCambioService } from './tasas-cambio.service';

@Injectable()
export class CuentasSchedulerService {
  private readonly logger = new Logger(CuentasSchedulerService.name);

  constructor(
    private readonly cuentas: CuentasService,
    private readonly tasasCambio: TasasCambioService,
  ) {}

  // Temprano en la mañana, antes de la foto de patrimonio: asi, si hay
  // cuentas en USD/EUR, el patrimonio del dia ya usa la tasa de hoy.
  @Cron('0 6 * * *', { timeZone: 'America/Bogota' })
  async actualizarTasasCambio(): Promise<void> {
    await this.tasasCambio.actualizar();
  }

  // Todos los dias a las 11 p. m. (hora Colombia) guarda el patrimonio del
  // mes, asi el historico tiene un punto por mes aunque nadie abra la app.
  @Cron('0 23 * * *', { timeZone: 'America/Bogota' })
  async fotoDiariaPatrimonio(): Promise<void> {
    const hogares = await this.cuentas.hogaresConCuentas();
    for (const hogarId of hogares) {
      try {
        await this.cuentas.registrarFoto(hogarId);
      } catch (error) {
        this.logger.error(`No se pudo guardar el patrimonio del hogar ${hogarId}`, error instanceof Error ? error.stack : error);
      }
    }
  }
}
