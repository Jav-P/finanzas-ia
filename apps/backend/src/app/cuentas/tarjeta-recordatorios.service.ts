import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from '../mail/mail.service';
import { CuentasService } from './cuentas.service';
import { proximaFechaDelMes } from './tarjetas.service';
import { hoyColombia, addDiasIso } from '../common/period';

// Igual que RecordatoriosService (obligaciones), pero para la fecha
// limite de pago de tarjetas con ciclo configurado. Como el ciclo se
// repite cada mes con una fecha distinta, el control de "ya se mando"
// es una tabla (cuenta_id, fecha_limite_pago, dias_antes) en vez de un
// par de booleanos.
@Injectable()
export class TarjetaRecordatoriosService {
  private readonly logger = new Logger(TarjetaRecordatoriosService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usuarios: UsuariosService,
    private readonly mail: MailService,
    private readonly cuentas: CuentasService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async enviarRecordatorios(): Promise<void> {
    const hogares = await this.cuentas.hogaresConCuentas();
    const hoy = hoyColombia();

    for (const hogarId of hogares) {
      const cuentas = await this.cuentas.findByHogar(hogarId);
      const tarjetas = cuentas.filter((c) => c.tipo === 'tarjeta_credito' && c.diaPago != null);

      for (const tarjeta of tarjetas) {
        const fechaPago = proximaFechaDelMes(tarjeta.diaPago!, hoy);
        for (const diasRestantes of [3, 1]) {
          if (fechaPago !== addDiasIso(hoy, diasRestantes)) continue;
          await this.avisarSiNoSeHaAvisado(hogarId, tarjeta.id, tarjeta.nombre, fechaPago, diasRestantes);
        }
      }
    }
  }

  private async avisarSiNoSeHaAvisado(
    hogarId: string,
    cuentaId: string,
    nombreTarjeta: string,
    fechaPago: string,
    diasRestantes: number,
  ): Promise<void> {
    const { data: existente } = await this.supabase.client
      .from('tarjeta_avisos')
      .select('id')
      .eq('cuenta_id', cuentaId)
      .eq('fecha_limite_pago', fechaPago)
      .eq('dias_antes', diasRestantes)
      .maybeSingle();
    if (existente) return;

    const { error } = await this.supabase.client
      .from('tarjeta_avisos')
      .insert({ cuenta_id: cuentaId, fecha_limite_pago: fechaPago, dias_antes: diasRestantes });
    if (error) return; // ya se inserto en otra corrida concurrente: no duplicar el envio

    const miembros = await this.usuarios.findByHogar(hogarId);
    for (const usuario of miembros) {
      await this.mail.enviarRecordatorioTarjeta(usuario.email, nombreTarjeta, fechaPago, diasRestantes);
    }
    this.logger.log(`Recordatorio de tarjeta (${diasRestantes}d) enviado para ${cuentaId}`);
  }
}
