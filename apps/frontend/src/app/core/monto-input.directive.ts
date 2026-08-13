import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const FORMATO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

function formatear(valor: number): string {
  return FORMATO.format(valor);
}

function parsear(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

// Input de texto que muestra separador de miles (formato es-CO, ej.
// 1.500.000) mientras se escribe, pero expone/recibe un number plano
// via ngModel. Pensado para montos en pesos (sin decimales, como el
// resto de la app los maneja).
@Directive({
  selector: 'input[appMonto]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MontoInputDirective),
      multi: true,
    },
  ],
  host: {
    '(input)': 'onInput($event)',
    '(blur)': 'onTouched()',
    type: 'text',
    inputmode: 'numeric',
  },
})
export class MontoInputDirective implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private onChange: (valor: number | null) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(valor: number | null): void {
    this.el.nativeElement.value = valor != null ? formatear(valor) : '';
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const posicionDesdeElFinal = input.value.length - (input.selectionStart ?? input.value.length);

    const valor = parsear(input.value);
    const formateado = valor != null ? formatear(valor) : '';
    input.value = formateado;

    const nuevaPosicion = Math.max(0, formateado.length - posicionDesdeElFinal);
    input.setSelectionRange(nuevaPosicion, nuevaPosicion);

    this.onChange(valor);
  }
}
