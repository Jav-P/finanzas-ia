import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

  async enviarInvitacion(email: string, hogarNombre: string, link: string): Promise<boolean> {
    try {
      await this.getTransporter().sendMail({
        from: '"Finanzas en pareja" <invitaciones@finanzas-ia.local>',
        to: email,
        subject: `Te invitaron al hogar "${hogarNombre}" en Finanzas en pareja`,
        html: `
          <p>Te invitaron a unirte al hogar <strong>${hogarNombre}</strong> en Finanzas en pareja.</p>
          <p><a href="${link}">Hace click aqui para registrarte y unirte</a></p>
          <p>Si el link no funciona, copia y pega esta direccion en tu navegador:<br>${link}</p>
        `,
      });
      return true;
    } catch (error) {
      this.logger.error('No se pudo enviar el correo de invitacion', error instanceof Error ? error.stack : error);
      return false;
    }
  }
}
