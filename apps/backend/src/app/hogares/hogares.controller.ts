import { Controller, Get } from '@nestjs/common';
import { HogarActual } from '../auth/usuario-actual.decorator';
import { HogaresService } from './hogares.service';

@Controller('hogares')
export class HogaresController {
  constructor(private readonly hogares: HogaresService) {}

  @Get('mio')
  mio(@HogarActual() hogarId: string) {
    return this.hogares.findOne(hogarId);
  }
}
