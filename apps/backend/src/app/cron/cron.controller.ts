import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { ObligacionesService } from '../obligaciones/obligaciones.service';
import { RecordatoriosService } from '../obligaciones/recordatorios.service';
import { TarjetaRecordatoriosService } from '../cuentas/tarjeta-recordatorios.service';
import { CuentasSchedulerService } from '../cuentas/cuentas-scheduler.service';

// Disparador externo (ver .github/workflows/cron-diario.yml): un cron en
// memoria (@Cron) solo corre si el proceso esta despierto justo a esa
// hora, y en Railway no hay garantia de eso. Pegandole a este endpoint
// una vez al dia desde GitHub Actions se fuerza a que las tareas
// diarias corran siempre, sin depender de que el proceso siga vivo.
@Controller('cron')
export class CronController {
  constructor(
    private readonly config: ConfigService,
    private readonly obligaciones: ObligacionesService,
    private readonly recordatorios: RecordatoriosService,
    private readonly tarjetaRecordatorios: TarjetaRecordatoriosService,
    private readonly cuentasScheduler: CuentasSchedulerService,
  ) {}

  @Public()
  @Post('diario')
  async diario(@Headers('authorization') authorization?: string) {
    const esperado = this.config.getOrThrow<string>('CRON_SECRET');
    if (authorization !== `Bearer ${esperado}`) {
      throw new UnauthorizedException();
    }

    const instancias = await this.obligaciones.generarPendientes();
    await this.cuentasScheduler.actualizarTasasCambio();
    await this.recordatorios.enviarRecordatorios();
    await this.tarjetaRecordatorios.enviarRecordatorios();
    await this.cuentasScheduler.fotoDiariaPatrimonio();

    return { ok: true, instancias };
  }
}
