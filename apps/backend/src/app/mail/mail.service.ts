import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const REMITENTE = '"Finanzas en pareja" <invitaciones@finanzasenpareja.com>';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  // Perezoso, igual que ClaudeService: si SMTP no esta configurado,
  // solo falla el envio de correo, no el arranque del backend.
  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.getOrThrow<string>('SMTP_HOST'),
        port: Number(this.config.getOrThrow<string>('SMTP_PORT')),
        secure: false,
        auth: this.config.get('SMTP_USER')
          ? { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') }
          : undefined,
      });
    }
    return this.transporter;
  }

  // Plantilla compartida con los mismos colores de la app (ver
  // apps/frontend/src/styles.scss). Todo con estilos inline y tablas:
  // es lo unico que renderiza bien en Gmail/Outlook/Apple Mail por
  // igual, un <style> o flexbox se ignoran en varios de esos clientes.
  private plantilla(opciones: { titulo: string; cuerpoHtml: string; boton: { texto: string; link: string } }): string {
    const logoUrl = `${this.config.getOrThrow<string>('FRONTEND_URL')}/favicon.png`;
    return `
      <div style="background:#0b0912; padding:32px 16px; font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" style="max-width:480px; margin:0 auto; border-collapse:collapse;">
          <tr>
            <td style="background:#130f1e; border:1px solid rgba(237,235,245,0.08); border-radius:16px; padding:36px 32px;">
              <table role="presentation" style="border-collapse:collapse; margin-bottom:24px;">
                <tr>
                  <td style="padding-right:10px;">
                    <img src="${logoUrl}" width="34" height="34" alt="" style="display:block; border-radius:10px;" />
                  </td>
                  <td style="font-size:15px; font-weight:bold; color:#edebf5; vertical-align:middle;">
                    Finanzas en pareja
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 16px; font-size:20px; color:#edebf5;">${opciones.titulo}</h1>

              <div style="font-size:14px; line-height:1.6; color:#9c94b8;">
                ${opciones.cuerpoHtml}
              </div>

              <table role="presentation" style="border-collapse:collapse; margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px; background:#8a4dff;">
                    <a href="${opciones.boton.link}"
                      style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:10px;">
                      ${opciones.boton.texto}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px; color:#635c7f; word-break:break-all; margin:16px 0 0;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                <a href="${opciones.boton.link}" style="color:#33e6e0;">${opciones.boton.link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0; text-align:center; font-size:12px; color:#635c7f;">
              Finanzas en pareja
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  async enviarInvitacion(email: string, hogarNombre: string, link: string): Promise<boolean> {
    try {
      await this.getTransporter().sendMail({
        from: REMITENTE,
        to: email,
        subject: `Te invitaron al hogar "${hogarNombre}" en Finanzas en pareja`,
        html: this.plantilla({
          titulo: 'Te invitaron a un hogar',
          cuerpoHtml: `<p>Te invitaron a unirte al hogar <strong style="color:#edebf5;">${hogarNombre}</strong> en Finanzas en pareja, para centralizar las finanzas juntos.</p>`,
          boton: { texto: 'Unirme al hogar', link },
        }),
      });
      return true;
    } catch (error) {
      this.logger.error('No se pudo enviar el correo de invitacion', error instanceof Error ? error.stack : error);
      return false;
    }
  }

  async enviarRecordatorioObligacion(
    email: string,
    descripcion: string,
    monto: number,
    fechaVencimiento: string,
    diasRestantes: number,
  ): Promise<boolean> {
    const link = `${this.config.getOrThrow<string>('FRONTEND_URL')}/obligaciones`;
    const montoTexto = monto.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const cuando = diasRestantes === 0 ? 'hoy' : diasRestantes === 1 ? 'mañana' : `en ${diasRestantes} días`;
    try {
      await this.getTransporter().sendMail({
        from: REMITENTE,
        to: email,
        subject: `"${descripcion}" vence ${cuando} (${montoTexto})`,
        html: this.plantilla({
          titulo: 'Un vencimiento se acerca',
          cuerpoHtml: `
            <p><strong style="color:#edebf5;">${descripcion}</strong> por ${montoTexto} vence ${cuando} (${fechaVencimiento}).</p>
          `,
          boton: { texto: 'Ver obligaciones', link },
        }),
      });
      return true;
    } catch (error) {
      this.logger.error('No se pudo enviar el recordatorio de obligacion', error instanceof Error ? error.stack : error);
      return false;
    }
  }

  async enviarRecordatorioTarjeta(
    email: string,
    nombreTarjeta: string,
    fechaPago: string,
    diasRestantes: number,
  ): Promise<boolean> {
    const link = `${this.config.getOrThrow<string>('FRONTEND_URL')}/cuentas`;
    const cuando = diasRestantes === 0 ? 'hoy' : diasRestantes === 1 ? 'mañana' : `en ${diasRestantes} días`;
    try {
      await this.getTransporter().sendMail({
        from: REMITENTE,
        to: email,
        subject: `El pago de "${nombreTarjeta}" vence ${cuando}`,
        html: this.plantilla({
          titulo: 'Fecha límite de pago cercana',
          cuerpoHtml: `
            <p>La fecha límite de pago de <strong style="color:#edebf5;">${nombreTarjeta}</strong> es ${cuando} (${fechaPago}).</p>
          `,
          boton: { texto: 'Ver tarjeta', link },
        }),
      });
      return true;
    } catch (error) {
      this.logger.error('No se pudo enviar el recordatorio de tarjeta', error instanceof Error ? error.stack : error);
      return false;
    }
  }

  async enviarRecuperacion(email: string, link: string): Promise<boolean> {
    try {
      await this.getTransporter().sendMail({
        from: REMITENTE,
        to: email,
        subject: 'Restablece tu contraseña en Finanzas en pareja',
        html: this.plantilla({
          titulo: 'Restablece tu contraseña',
          cuerpoHtml: `
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Si tú no la pediste, ignora este correo: tu contraseña actual sigue funcionando.</p>
          `,
          boton: { texto: 'Elegir contraseña nueva', link },
        }),
      });
      return true;
    } catch (error) {
      this.logger.error('No se pudo enviar el correo de recuperacion', error instanceof Error ? error.stack : error);
      return false;
    }
  }
}
