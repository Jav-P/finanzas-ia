import { Component, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MontosVisibilidadService } from './montos-visibilidad.service';

// Envuelve un monto numerico: lo muestra formateado o, si el usuario
// activo "ocultar montos", unos puntos del mismo ancho visual.
@Component({
  selector: 'app-monto',
  imports: [DecimalPipe],
  template: `
    @if (visibilidad.visible()) {
      {{ valor() | number: formato() }}
    } @else {
      <span class="monto-oculto">••••••</span>
    }
  `,
  styles: `
    .monto-oculto {
      letter-spacing: 0.1em;
    }
  `,
})
export class MontoOculto {
  protected readonly visibilidad = inject(MontosVisibilidadService);

  readonly valor = input.required<number>();
  readonly formato = input('1.0-0');
}
