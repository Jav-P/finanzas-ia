import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import type { ChartConfiguration } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import type {
  Balance,
  CategoriaCosto,
  CreditoResumen,
  Patrimonio,
  PresupuestoResumenItem,
  SaludFinanciera,
} from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { ChartDirective } from '../../core/chart.directive';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { FORMATO_MES_ANIO, periodoActual, periodoDe, periodoMasMeses } from '../../core/mes-anio-formats';

const CYAN = '#33e6e0';
const VIOLET = '#8a4dff';
const MAGENTA = '#ef4ee3';
const DANGER = '#ff5a7a';
const TEXT_DIM = '#9c94b8';
const GRID = 'rgba(237, 235, 245, 0.08)';

function nombreMes(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

@Component({
  selector: 'app-analisis',
  imports: [
    FormsModule,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    ChartDirective,
    MontoInputDirective,
  ],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATO_MES_ANIO }],
  templateUrl: './analisis.html',
  styleUrl: './analisis.scss',
})
export class Analisis implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly periodo = signal(periodoActual());
  protected readonly balance = signal<Balance | null>(null);
  protected readonly categoriasCosto = signal<CategoriaCosto[]>([]);
  protected readonly resumenPresupuestos = signal<PresupuestoResumenItem[]>([]);
  protected readonly salud = signal<SaludFinanciera | null>(null);
  protected readonly patrimonio = signal<Patrimonio | null>(null);
  protected readonly creditos = signal<CreditoResumen[]>([]);

  // Simulador "¿abono o invierto?"
  protected creditoSimuladoId = '';
  protected tasaInversion: number | null = null;

  // Simulador "¿qué pasa si...?"
  protected reduccionIngresoMensual: number | null = null;
  protected gastoImprevistoUnico: number | null = null;

  ngOnInit(): void {
    this.cargar();
    this.api.creditos().subscribe((creditos) => this.creditos.set(creditos));
  }

  // Metodo (no computed): creditoSimuladoId es una propiedad normal que
  // cambia por ngModel, no una signal, asi que un computed() no la
  // detectaria y quedaria con el primer valor cacheado para siempre.
  protected creditoSimulado(): CreditoResumen | null {
    return this.creditos().find((c) => c.obligacionId === this.creditoSimuladoId) ?? null;
  }

  // Si lo que rendiria invertir es menor que la tasa del credito mas
  // caro, abonar a ese credito "rinde" mas garantizado que invertir.
  protected recomendacionAbonoOInversion(): string | null {
    const credito = this.creditoSimulado();
    if (!credito || credito.tasaInteres == null || this.tasaInversion == null) return null;

    if (this.tasaInversion > credito.tasaInteres) {
      return `Invertir (${this.tasaInversion}% E.A.) rendiría más que lo que te cuesta "${credito.descripcion}" (${credito.tasaInteres}% E.A.). Conviene más invertir ese dinero.`;
    }
    return `"${credito.descripcion}" te cuesta ${credito.tasaInteres}% E.A., más de lo que rendiría invertir (${this.tasaInversion}%). Abonarle es la apuesta más segura.`;
  }

  // Colchon de emergencia y capacidad de inversión recalculados con los
  // ajustes hipotéticos del simulador, usando la misma formula que el
  // backend (gastoMensualFijo = obligacionesProyectadas + presupuestado).
  // Metodo, no computed: los montos del simulador son propiedades
  // normales (ngModel), no signals.
  protected simulacionEscenario(): { nuevoDisponible: number; nuevoColchon: number | null; nuevaCapacidad: number } | null {
    const b = this.balance();
    const p = this.patrimonio();
    if (!b || !p) return null;

    const reduccion = this.reduccionIngresoMensual ?? 0;
    const imprevisto = this.gastoImprevistoUnico ?? 0;
    const gastoMensualFijo = b.obligacionesProyectadas + b.presupuestado;

    const nuevoDisponible = p.disponible - imprevisto;
    const nuevoColchon = gastoMensualFijo > 0 ? nuevoDisponible / gastoMensualFijo : null;
    const nuevaCapacidad = b.disponibleParaCreditos - reduccion;

    return { nuevoDisponible, nuevoColchon, nuevaCapacidad };
  }

  periodoFecha(): Date {
    const [anio, mes] = this.periodo().split('-').map(Number);
    return new Date(anio, mes - 1, 1);
  }

  seleccionarMes(fecha: Date, datepicker: MatDatepicker<Date>): void {
    this.periodo.set(periodoDe(fecha));
    this.cargar();
    datepicker.close();
  }

  mesAnterior(): void {
    this.periodo.set(periodoMasMeses(this.periodo(), -1));
    this.cargar();
  }

  mesSiguiente(): void {
    this.periodo.set(periodoMasMeses(this.periodo(), 1));
    this.cargar();
  }

  // Que es lo mas caro: ranking de categorias, cada barra dividida en
  // fijo (obligaciones) y variable (presupuestos), de mayor a menor.
  protected readonly chartMasCaro = computed<ChartConfiguration | undefined>(() => {
    const categorias = this.categoriasCosto();
    if (!categorias.length) return undefined;

    return {
      type: 'bar',
      data: {
        labels: categorias.map((c) => c.categoriaNombre),
        datasets: [
          { label: 'Fijo (obligaciones)', data: categorias.map((c) => c.obligaciones), backgroundColor: VIOLET },
          { label: 'Variable (presupuestos)', data: categorias.map((c) => c.presupuesto), backgroundColor: MAGENTA },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { color: TEXT_DIM }, grid: { color: GRID } },
          y: { stacked: true, ticks: { color: TEXT_DIM }, grid: { display: false } },
        },
        plugins: { legend: { labels: { color: TEXT_DIM } } },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (!target) return;
          const categoria = elements[0] ? categorias[elements[0].index] : undefined;
          target.style.cursor = categoria && this.esCategoriaCreditos(categoria) ? 'pointer' : 'default';
        },
        onClick: (_event, elements) => {
          const categoria = elements[0] ? categorias[elements[0].index] : undefined;
          if (categoria && this.esCategoriaCreditos(categoria)) {
            this.router.navigateByUrl('/creditos');
          }
        },
      },
    };
  });

  private esCategoriaCreditos(categoria: CategoriaCosto): boolean {
    const nombre = categoria.categoriaNombre.toLowerCase().replace('é', 'e');
    return nombre.startsWith('credit');
  }

  // Plan del mes: una sola barra (el sueldo) dividida en lo que se va a
  // obligaciones fijas del mes siguiente, presupuestos de este mes, y lo
  // que queda disponible.
  protected readonly chartPlanDelMes = computed<ChartConfiguration | undefined>(() => {
    const b = this.balance();
    if (!b) return undefined;

    return {
      type: 'bar',
      data: {
        labels: [`Sueldo de ${nombreMes(b.periodo)}`],
        datasets: [
          { label: `Obligaciones fijas (${nombreMes(b.periodoObligacionesProyectadas)})`, data: [b.obligacionesProyectadas], backgroundColor: VIOLET },
          { label: `Presupuestos (${nombreMes(b.periodo)})`, data: [b.presupuestado], backgroundColor: MAGENTA },
          { label: 'Disponible', data: [b.disponibleParaCreditos], backgroundColor: CYAN },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { color: TEXT_DIM }, grid: { color: GRID } },
          y: { stacked: true, ticks: { color: TEXT_DIM }, grid: { display: false } },
        },
        plugins: { legend: { labels: { color: TEXT_DIM } } },
      },
    };
  });

  // Presupuestado vs. gastado real, por categoria.
  protected readonly chartPresupuestadoVsGastado = computed<ChartConfiguration | undefined>(() => {
    const resumen = this.resumenPresupuestos();
    if (!resumen.length) return undefined;

    return {
      type: 'bar',
      data: {
        labels: resumen.map((r) => r.categoriaNombre),
        datasets: [
          { label: 'Presupuestado', data: resumen.map((r) => r.presupuestado), backgroundColor: VIOLET },
          {
            label: 'Gastado',
            data: resumen.map((r) => r.gastado),
            backgroundColor: resumen.map((r) => (r.gastado > r.presupuestado ? DANGER : CYAN)),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: TEXT_DIM }, grid: { display: false } },
          y: { ticks: { color: TEXT_DIM }, grid: { color: GRID } },
        },
        plugins: { legend: { labels: { color: TEXT_DIM } } },
      },
    };
  });

  private cargar(): void {
    const periodo = this.periodo();
    this.api.balance(periodo).subscribe((balance) => this.balance.set(balance));
    this.api.analisisCategorias(periodo).subscribe((categorias) => this.categoriasCosto.set(categorias));
    this.api.presupuestosResumen(periodo).subscribe((resumen) => this.resumenPresupuestos.set(resumen));
    this.api.saludFinanciera(periodo).subscribe((salud) => this.salud.set(salud));
    this.api.patrimonio().subscribe((patrimonio) => this.patrimonio.set(patrimonio));
  }
}
