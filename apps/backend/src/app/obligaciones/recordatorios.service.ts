import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from '../mail/mail.service';
import { hoyColombia, addDiasIso } from '../common/period';

// Avisa 3 dias y 1 dia antes de que venza una instancia pendiente.
// Cada combinacion (instancia, "3d"/"1d") se manda una sola vez, por
// las columnas aviso_3d_enviado / aviso_1d_enviado.
@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usuarios: UsuariosService,
    private readonly mail: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async enviarRecordatorios(): Promise<void> {
    const hoy = hoyColombia();
    await this.procesarTanda(addDiasIso(hoy, 3), 'aviso_3d_enviado', 3);
    await this.procesarTanda(addDiasIso(hoy, 1), 'aviso_1d_enviado', 1);
  }

  private async procesarTanda(fechaVencimiento: string, columnaAviso: string, diasRestantes: number): Promise<void> {
    const { data: instancias, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('id, obligacion_id, fecha_vencimiento, monto')
      .eq('fecha_vencimiento', fechaVencimiento)
      .eq('estado', 'pendiente')
      .eq(columnaAviso, false);
    if (error || !instancias?.length) return;

    for (const instancia of instancias) {
      const { data: obligacion } = await this.supabase.client
        .from('obligaciones')
        .select('hogar_id, usuario_responsable_id, descripcion')
        .eq('id', instancia.obligacion_id)
        .maybeSingle();
      if (!obligacion) continue;

      const destinatarios = obligacion.usuario_responsable_id
        ? [await this.usuarios.findOne(obligacion.usuario_responsable_id)].filter((u): u is NonNullable<typeof u> => !!u)
        : await this.usuarios.findByHogar(obligacion.hogar_id);

      for (const usuario of destinatarios) {
        await this.mail.enviarRecordatorioObligacion(
          usuario.email,
          obligacion.descripcion,
          Number(instancia.monto),
          instancia.fecha_vencimiento,
          diasRestantes,
        );
      }

      await this.supabase.client.from('obligacion_instancias').update({ [columnaAviso]: true }).eq('id', instancia.id);
      this.logger.log(`Recordatorio (${diasRestantes}d) enviado para instancia ${instancia.id}`);
    }
  }
}
