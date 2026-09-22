import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import type { ChartConfiguration } from 'chart.js';
import type { CreditoResumen } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { ChartDirective } from '../../core/chart.directive';

const CYAN = '#33e6e0';
const VIOLET = '#8a4dff';
const MAGENTA = '#ef4ee3';
const TEXT_DIM = '#9c94b8';
const GRID = 'rgba(237, 235, 245, 0.08)';

type ColumnaOrden =
  | 'banco'
  | 'descripcion'
  | 'categoria'
  | 'montoCuota'
  | 'tasaInteres'
  | 'cuotasRestantes'
  | 'proximaFechaVencimiento'
  | 'saldoPendiente';

@Component({
  selector: 'app-creditos',
  imports: [
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MontoInputDirective,
    ChartDirective,
  ],
  templateUrl: './creditos.html',
  styleUrl: './creditos.scss',
})
export class Creditos implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly creditos = signal<CreditoResumen[]>([]);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected saldoEdit: number | null = null;

  protected readonly ordenColumna = signal<ColumnaOrden | null>(null);
  protected readonly ordenAscendente = signal(true);

  protected readonly creditosOrdenados = computed(() => {
    const columna = this.ordenColumna();
    const lista = [...this.creditos()];
    if (!columna) return lista;

    const factor = this.ordenAscendente() ? 1 : -1;
    return lista.sort((a, b) => {
      const va = this.valorColumna(a, columna);
      const vb = this.valorColumna(b, columna);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // sin dato: siempre al final, sin importar el sentido
      if (vb == null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, 'es', { sensitivity: 'base' }) * factor;
      }
      return ((va as number) - (vb as number)) * factor;
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  // Saldo pendiente por credito, de mayor a menor.
  protected readonly chartSaldos = computed<ChartConfiguration | undefined>(() => {
    const conSaldo = this.creditos()
      .filter((c) => c.saldoPendiente != null)
      .sort((a, b) => (b.saldoPendiente ?? 0) - (a.saldoPendiente ?? 0));
    if (!conSaldo.length) return undefined;

    return {
      type: 'bar',
      data: {
        labels: conSaldo.map((c) => c.descripcion),
        datasets: [{ label: 'Saldo pendiente', data: conSaldo.map((c) => c.saldoPendiente), backgroundColor: VIOLET }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: TEXT_DIM }, grid: { color: GRID } },
          y: { ticks: { color: TEXT_DIM }, grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    };
  });

  // Tasa de interes E.A. por credito, de mayor a menor (el primero es
  // el que mas conviene priorizar pagar segun el metodo avalancha).
  protected readonly chartTasas = computed<ChartConfiguration | undefined>(() => {
    const conTasa = this.creditos()
      .filter((c) => c.tasaInteres != null)
      .sort((a, b) => (b.tasaInteres ?? 0) - (a.tasaInteres ?? 0));
    if (!conTasa.length) return undefined;

    return {
      type: 'bar',
      data: {
        labels: conTasa.map((c) => c.descripcion),
        datasets: [{ label: 'Tasa E.A. (%)', data: conTasa.map((c) => c.tasaInteres), backgroundColor: MAGENTA }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: TEXT_DIM }, grid: { color: GRID } },
          y: { ticks: { color: TEXT_DIM }, grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    };
  });

  // Cuotas pagadas vs. restantes, solo para creditos con numero de
  // cuotas definido (los indefinidos no tienen un total contra el cual
  // mostrar progreso).
  protected readonly chartCuotas = computed<ChartConfiguration | undefined>(() => {
    const conCuotas = this.creditos().filter((c) => c.numeroCuotas != null);
    if (!conCuotas.length) return undefined;

    return {
      type: 'bar',
      data: {
        labels: conCuotas.map((c) => c.descripcion),
        datasets: [
          { label: 'Pagadas', data: conCuotas.map((c) => c.cuotasPagadas), backgroundColor: CYAN },
          { label: 'Restantes', data: conCuotas.map((c) => c.cuotasRestantes ?? 0), backgroundColor: VIOLET },
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

  ordenarPor(columna: ColumnaOrden): void {
    if (this.ordenColumna() === columna) {
      this.ordenAscendente.set(!this.ordenAscendente());
    } else {
      this.ordenColumna.set(columna);
      this.ordenAscendente.set(true);
    }
  }

  indicadorOrden(columna: ColumnaOrden): string {
    if (this.ordenColumna() !== columna) return '';
    return this.ordenAscendente() ? '▲' : '▼';
  }

  private valorColumna(credito: CreditoResumen, columna: ColumnaOrden): string | number | null {
    switch (columna) {
      case 'banco':
        return credito.banco ?? '';
      case 'descripcion':
        return credito.descripcion;
      case 'categoria':
        return credito.categoriaNombre;
      case 'montoCuota':
        return credito.montoCuota;
      case 'tasaInteres':
        return credito.tasaInteres;
      case 'cuotasRestantes':
        return credito.cuotasRestantes;
      case 'proximaFechaVencimiento':
        return credito.proximaFechaVencimiento;
      case 'saldoPendiente':
        return credito.saldoPendiente;
    }
  }

  editarSaldo(credito: CreditoResumen): void {
    this.editandoId.set(credito.obligacionId);
    this.saldoEdit = credito.saldoPendiente;
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarSaldo(obligacionId: string): void {
    if (this.saldoEdit == null) return;
    this.guardando.set(true);
    this.api.actualizarSaldoCredito(obligacionId, { saldoPendiente: this.saldoEdit }).subscribe(() => {
      this.guardando.set(false);
      this.editandoId.set(null);
      this.cargar();
    });
  }

  desactivarCredito(credito: CreditoResumen): void {
    this.api.desactivarObligacion(credito.obligacionId).subscribe(() => this.cargar());
  }

  private cargar(): void {
    this.api.creditos().subscribe((creditos) => this.creditos.set(creditos));
  }
}
