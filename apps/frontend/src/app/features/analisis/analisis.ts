import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import type { ChartConfiguration } from 'chart.js';
import type { Balance, CategoriaCosto, PresupuestoResumenItem } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { ChartDirective } from '../../core/chart.directive';
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
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    ChartDirective,
  ],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATO_MES_ANIO }],
  templateUrl: './analisis.html',
  styleUrl: './analisis.scss',
})
export class Analisis implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly periodo = signal(periodoActual());
  protected readonly balance = signal<Balance | null>(null);
  protected readonly categoriasCosto = signal<CategoriaCosto[]>([]);
  protected readonly resumenPresupuestos = signal<PresupuestoResumenItem[]>([]);

  ngOnInit(): void {
    this.cargar();
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
      },
    };
  });

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
  }
}
