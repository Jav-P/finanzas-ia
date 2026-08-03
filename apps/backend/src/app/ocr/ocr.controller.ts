import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ExtractoOcrResultado, FacturaOcrResultado } from '@finanzas-ia/shared-types';
import { ClaudeService } from './claude.service';

const PROMPT_FACTURA = `Esta imagen o PDF es una factura/ticket de compra (ej. supermercado, mercado).
Extrae la informacion en un JSON con exactamente esta forma:
{
  "lugarNombre": string | null,
  "fecha": string | null,
  "montoTotal": number | null,
  "items": [
    { "productoNombre": string, "cantidad": number, "precioUnitario": number }
  ]
}
La fecha debe ir en formato YYYY-MM-DD. Si no logras leer un dato con confianza, usa null en ese campo (no inventes valores).`;

const PROMPT_EXTRACTO = `Esta imagen o PDF es un extracto/estado de cuenta de una tarjeta de credito.
Extrae todas las transacciones de compra (no incluyas el pago total del extracto ni intereses/comisiones a menos que sean la unica transaccion) en un JSON con exactamente esta forma:
{
  "transacciones": [
    { "fecha": string, "descripcion": string, "monto": number }
  ]
}
La fecha debe ir en formato YYYY-MM-DD.`;

@Controller('ocr')
export class OcrController {
  constructor(private readonly claude: ClaudeService) {}

  @Post('factura')
  @UseInterceptors(FileInterceptor('archivo'))
  async factura(@UploadedFile() file?: Express.Multer.File): Promise<FacturaOcrResultado> {
    if (!file) throw new BadRequestException('El archivo de la factura es requerido');
    return this.claude.extraerJson<FacturaOcrResultado>(file, PROMPT_FACTURA);
  }

  @Post('extracto')
  @UseInterceptors(FileInterceptor('archivo'))
  async extracto(@UploadedFile() file?: Express.Multer.File): Promise<ExtractoOcrResultado> {
    if (!file) throw new BadRequestException('El archivo del extracto es requerido');
    return this.claude.extraerJson<ExtractoOcrResultado>(file, PROMPT_EXTRACTO);
  }
}
