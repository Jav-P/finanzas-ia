import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const MODELO_ECONOMICO = 'claude-haiku-4-5-20251001';

@Injectable()
export class ClaudeService {
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  // El cliente se crea recien al usarlo (no en el constructor): asi,
  // si ANTHROPIC_API_KEY no esta configurada, solo fallan los
  // endpoints de OCR y no el arranque completo del backend.
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new InternalServerErrorException(
          'Falta configurar ANTHROPIC_API_KEY en el .env para usar OCR',
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  // Manda un documento (imagen o PDF) + instrucciones, y espera de
  // vuelta un JSON. Usado para OCR de facturas y extractos: tareas
  // rutinarias donde alcanza el modelo mas economico (Haiku).
  async extraerJson<T>(file: Express.Multer.File, instrucciones: string): Promise<T> {
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
      throw new InternalServerErrorException('Claude no devolvio texto en la respuesta');
    }

    return this.parsearJson<T>(bloque.text);
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

    try {
      return JSON.parse(limpio) as T;
    } catch {
      throw new InternalServerErrorException('No se pudo interpretar la respuesta de Claude como JSON');
    }
  }
}
