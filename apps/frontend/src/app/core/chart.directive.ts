import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

// Wrapper delgado sobre Chart.js: crea el chart la primera vez y en
// cada cambio de config solo actualiza data/options (evita destruir y
// recrear el canvas, que se ve feo por la animacion de entrada).
@Directive({
  selector: 'canvas[appChart]',
})
export class ChartDirective implements OnChanges, OnDestroy {
  @Input('appChart') config?: ChartConfiguration;

  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private chart: Chart | null = null;

  ngOnChanges(): void {
    if (!this.config) return;

    if (this.chart) {
      this.chart.data = this.config.data;
      this.chart.options = this.config.options ?? {};
      this.chart.update();
      return;
    }

    this.chart = new Chart(this.el.nativeElement, this.config);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
