import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ChartConfiguration } from 'chart.js';
import type { Cuenta, Movimiento, Patrimonio, PatrimonioMes, TipoCuenta } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { ChartDirective } from '../../core/chart.directive';
import { dateToIso } from '../../core/date-utils';

const ETIQUETA_TIPO_CUENTA: Record<TipoCuenta, string> = {
  efectivo: 'Efectivo',
  ahorros: 'Cuenta de ahorros',
  bolsillo: 'Bolsillo',
  tarjeta_credito: 'Tarjeta de crédito',
  inversion: 'Inversión',
};

const ETIQUETA_TIPO_MOVIMIENTO: Record<Movimiento['tipo'], string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  pago_obligacion: 'Pago de obligación',
  transferencia: 'Transferencia',
  ajuste: 'Ajuste',
};

const CYAN = '#33e6e0';
const VIOLET = '#8a4dff';
const MAGENTA = '#ef4ee3';
const TEXT_DIM = '#9c94b8';
const GRID = 'rgba(237, 235, 245, 0.08)';

function etiquetaMes(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
}

@Component({
  selector: 'app-cuentas',
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MontoInputDirective,
    ChartDirective,
  ],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.scss',
})
export class Cuentas implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly etiquetaTipo = ETIQUETA_TIPO_CUENTA;
  protected readonly cuentas = signal<Cuenta[]>([]);
  protected readonly patrimonio = signal<Patrimonio | null>(null);
  protected readonly historico = signal<PatrimonioMes[]>([]);
  protected readonly movimientos = signal<Movimiento[]>([]);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly mostrarTransferencia = signal(false);
  protected readonly etiquetaTipoMovimiento = ETIQUETA_TIPO_MOVIMIENTO;

  protected tipo: TipoCuenta = 'ahorros';
  protected nombre = '';
  protected cuentaPadreId = '';
  protected saldo: number | null = null;

  protected cuentaOrigenId = '';
  protected cuentaDestinoId = '';
  protected montoTransferencia: number | null = null;
  protected fechaTransferencia: Date | null = new Date();
  protected descripcionTransferencia = '';

  protected readonly editandoId = signal<string | null>(null);
  protected saldoEdit: number | null = null;

  protected readonly cuentasAhorros = computed(() => this.cuentas().filter((c) => c.tipo === 'ahorros'));
  protected readonly nombrePorCuenta = computed(() => new Map(this.cuentas().map((c) => [c.id, c.nombre])));

  // La plata disponible (cada cuenta seguida de sus bolsillos), las
  // inversiones y lo que se debe en tarjetas.
  protected readonly grupos = computed(() => {
    const todas = this.cuentas();
    return [
      {
        titulo: 'Disponible',
        cuentas: todas
          .filter((c) => c.tipo === 'efectivo' || c.tipo === 'ahorros')
          .flatMap((c) => [c, ...todas.filter((b) => b.cuentaPadreId === c.id)]),
      },
      { titulo: 'Inversiones', cuentas: todas.filter((c) => c.tipo === 'inversion') },
      { titulo: 'Tarjetas de crédito', cuentas: todas.filter((c) => c.tipo === 'tarjeta_credito') },
    ].filter((g) => g.cuentas.length);
  });

  protected readonly chartHistorico = computed<ChartConfiguration | undefined>(() => {
    const meses = this.historico();
    if (!meses.length || !this.cuentas().length) return undefined;

    return {
      type: 'line',
      data: {
        labels: meses.map((m) => etiquetaMes(m.periodo)),
        datasets: [
          { label: 'Patrimonio neto', data: meses.map((m) => m.patrimonioNeto), borderColor: CYAN, backgroundColor: CYAN, tension: 0.3 },
          { label: 'Disponible', data: meses.map((m) => m.disponible), borderColor: VIOLET, backgroundColor: VIOLET, tension: 0.3 },
          { label: 'Inversiones', data: meses.map((m) => m.inversiones), borderColor: '#4f9dff', backgroundColor: '#4f9dff', tension: 0.3 },
          { label: 'Deudas', data: meses.map((m) => m.deudas), borderColor: MAGENTA, backgroundColor: MAGENTA, tension: 0.3 },
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

  ngOnInit(): void {
    this.cargar();
  }

  etiquetaSaldo(tipo: TipoCuenta): string {
    if (tipo === 'tarjeta_credito') return 'Deuda actual';
    if (tipo === 'inversion') return 'Valor actual';
    return 'Saldo actual';
  }

  placeholderNombre(tipo: TipoCuenta): string {
    if (tipo === 'tarjeta_credito') return 'Visa Bancolombia';
    if (tipo === 'bolsillo') return 'Vacaciones';
    if (tipo === 'inversion') return 'CDT Bancolombia';
    return 'Nequi';
  }

  abrirForm(): void {
    this.tipo = 'ahorros';
    this.nombre = '';
    this.cuentaPadreId = '';
    this.saldo = null;
    this.mostrarForm.set(true);
  }

  guardar(): void {
    if (!this.nombre || (this.tipo === 'bolsillo' && !this.cuentaPadreId)) return;

    this.guardando.set(true);
    this.api
      .crearCuenta({
        nombre: this.nombre,
        tipo: this.tipo,
        cuentaPadreId: this.tipo === 'bolsillo' ? this.cuentaPadreId : null,
        saldo: this.saldo ?? 0,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarForm.set(false);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo crear la cuenta'),
      });
  }

  editarSaldo(cuenta: Cuenta): void {
    this.editandoId.set(cuenta.id);
    this.saldoEdit = cuenta.saldo;
  }

  guardarSaldo(id: string): void {
    if (this.saldoEdit == null) return;
    this.guardando.set(true);
    this.api.editarCuenta(id, { saldo: this.saldoEdit }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editandoId.set(null);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo actualizar el saldo'),
    });
  }

  eliminar(cuenta: Cuenta): void {
    if (!confirm(`¿Eliminar "${cuenta.nombre}"?`)) return;
    this.api.eliminarCuenta(cuenta.id).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo eliminar la cuenta'),
    });
  }

  abrirTransferencia(): void {
    this.cuentaOrigenId = '';
    this.cuentaDestinoId = '';
    this.montoTransferencia = null;
    this.fechaTransferencia = new Date();
    this.descripcionTransferencia = '';
    this.mostrarTransferencia.set(true);
  }

  transferir(): void {
    if (!this.cuentaOrigenId || !this.cuentaDestinoId || !this.montoTransferencia) return;
    const fecha = dateToIso(this.fechaTransferencia);
    if (!fecha) return;

    this.guardando.set(true);
    this.api
      .transferir({
        cuentaOrigenId: this.cuentaOrigenId,
        cuentaDestinoId: this.cuentaDestinoId,
        monto: this.montoTransferencia,
        fecha,
        descripcion: this.descripcionTransferencia,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarTransferencia.set(false);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo registrar la transferencia'),
      });
  }

  eliminarMovimiento(movimiento: Movimiento): void {
    if (!confirm('¿Eliminar este movimiento? Los saldos de las cuentas involucradas se ajustan de vuelta.')) return;
    this.api.eliminarMovimiento(movimiento.id).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo eliminar el movimiento'),
    });
  }

  private mostrarError(err: HttpErrorResponse, porDefecto: string): void {
    this.guardando.set(false);
    this.snackBar.open(err.error?.message ?? porDefecto, 'Cerrar', { duration: 6000 });
  }

  private cargar(): void {
    this.api.cuentas().subscribe((cuentas) => this.cuentas.set(cuentas));
    this.api.patrimonio().subscribe((patrimonio) => this.patrimonio.set(patrimonio));
    this.api.patrimonioHistorico().subscribe((historico) => this.historico.set(historico));
    this.api.movimientos().subscribe((movimientos) => this.movimientos.set(movimientos));
  }
}
