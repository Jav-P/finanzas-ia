import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ObligacionesService } from './obligaciones.service';

// En produccion el disparador real seria un cron externo (GitHub
// Actions) pegandole a POST /obligaciones/generar-instancias, como en
// el resto del proyecto. Este cron interno cubre el caso de que el
// backend corra de forma continua (o mientras se prueba localmente).
@Injectable()
export class InstanciasSchedulerService {
  private readonly logger = new Logger(InstanciasSchedulerService.name);

  constructor(private readonly obligaciones: ObligacionesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generarInstanciasDiarias(): Promise<void> {
    const resultado = await this.obligaciones.generarPendientes();
    this.logger.log(`Cron diario: ${JSON.stringify(resultado)}`);
  }
}
