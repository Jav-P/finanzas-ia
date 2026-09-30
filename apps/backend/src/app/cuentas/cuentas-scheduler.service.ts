import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CuentasService } from './cuentas.service';

@Injectable()
export class CuentasSchedulerService {
  private readonly logger = new Logger(CuentasSchedulerService.name);

  constructor(private readonly cuentas: CuentasService) {}

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
