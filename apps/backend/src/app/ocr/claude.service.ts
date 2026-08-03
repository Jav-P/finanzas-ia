import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const MODELO_ECONOMICO = 'claude-haiku-4-5-20251001';
const MENSAJE_NO_DISPONIBLE =
  'El servicio de IA (Claude) no está disponible en este momento. Intenta más tarde o ingresa los datos manualmente.';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  // Manda un documento (imagen o PDF) + instrucciones, y espera de
  // vuelta un JSON. Usado para OCR de facturas y extractos: tareas
  // rutinarias donde alcanza el modelo mas economico (Haiku).
  //
  // Cualquier falla (key faltante, red, rate limit, respuesta rara)
  // se traduce siempre al mismo error de cara al usuario: el detalle
  // real solo queda en el log del servidor.
  async extraerJson<T>(file: Express.Multer.File, instrucciones: string): Promise<T> {
    try {
      const documento = this.toContentBlock(file);

      const respuesta = await this.getClient().messages.create({
        model: MODELO_ECONOMICO,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              documento,
              {
                type: 'text',
                text: `${instrucciones}\n\nResponde UNICAMENTE con el JSON solicitado, sin texto adicional, sin explicaciones y sin bloques de markdown (\`\`\`).`,
              },
            ],
          },
        ],
      });

      const bloque = respuesta.content.find((b) => b.type === 'text');
      if (!bloque || bloque.type !== 'text') {
        throw new Error('Claude no devolvio un bloque de texto en la respuesta');
      }

      return this.parsearJson<T>(bloque.text);
    } catch (error) {
      this.logger.error('Fallo la llamada a Claude API', error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException(MENSAJE_NO_DISPONIBLE);
    }
  }

  // El cliente se crea recien al usarlo (no en el constructor): asi,
  // si ANTHROPIC_API_KEY no esta configurada, solo fallan los
  // endpoints de OCR y no el arranque completo del backend.
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new Error('Falta configurar ANTHROPIC_API_KEY en el .env');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  private toContentBlock(file: Express.Multer.File): Anthropic.Messages.ContentBlockParam {
    const data = file.buffer.toString('base64');

    if (file.mimetype === 'application/pdf') {
      return {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data },
      };
    }

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data,
      },
    };
  }

  private parsearJson<T>(texto: string): T {
    const limpio = texto
      .trim()
      .replace(/^```(json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    return JSON.parse(limpio) as T;
  }
}
