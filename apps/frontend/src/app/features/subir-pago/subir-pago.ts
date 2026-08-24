import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Categoria, InstanciaConDetalle } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { dateToIso, isoToDate } from '../../core/date-utils';

type Tipo = 'obligacion' | 'gasto';

@Component({
  selector: 'app-subir-pago',
  imports: [
    FormsModule,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MontoInputDirective,
  ],
  templateUrl: './subir-pago.html',
  styleUrl: './subir-pago.scss',
})
export class SubirPago implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly session = inject(SessionService);

  protected readonly tipo = signal<Tipo | null>(null);
  protected readonly guardando = signal(false);
  protected readonly leyendoComprobante = signal(false);
  protected readonly ocrFallo = signal(false);

  // Pago de obligacion
  protected readonly pendientes = signal<InstanciaConDetalle[]>([]);
  protected instanciaId = '';
  protected fechaPago: Date | null = null;
  protected montoPagado: number | null = null;
  protected archivoObligacion: File | null = null;

  // Gasto de presupuesto
  protected readonly categorias = signal<Categoria[]>([]);
  protected categoriaId = '';
  protected montoGasto: number | null = null;
  protected fechaGasto: Date | null = null;
  protected descripcionGasto = '';
  protected archivoGasto: File | null = null;

  ngOnInit(): void {
    this.api.categorias().subscribe((categorias) => this.categorias.set(categorias));
  }

  elegirTipo(tipo: Tipo): void {
    this.tipo.set(tipo);
    this.ocrFallo.set(false);
    if (tipo === 'obligacion') this.cargarPendientes();
  }

  volver(): void {
    this.tipo.set(null);
  }

  onArchivoObligacion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.archivoObligacion = archivo;
    if (!archivo) return;

    this.ocrFallo.set(false);
    this.leyendoComprobante.set(true);
    this.api.ocrComprobantePago(archivo).subscribe({
      next: (resultado) => {
        this.leyendoComprobante.set(false);
        if (resultado.monto != null) this.montoPagado = resultado.monto;
        if (resultado.fecha) this.fechaPago = isoToDate(resultado.fecha);
      },
      error: () => {
        this.leyendoComprobante.set(false);
        this.ocrFallo.set(true);
      },
    });
  }

  onArchivoGasto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.archivoGasto = archivo;
    if (!archivo) return;

    this.ocrFallo.set(false);
    this.leyendoComprobante.set(true);
    this.api.ocrFactura(archivo).subscribe({
      next: (resultado) => {
        this.leyendoComprobante.set(false);
        if (resultado.montoTotal != null) this.montoGasto = resultado.montoTotal;
        if (resultado.fecha) this.fechaGasto = isoToDate(resultado.fecha);
      },
      error: () => {
        this.leyendoComprobante.set(false);
        this.ocrFallo.set(true);
      },
    });
  }

  registrarPago(): void {
    const usuarioId = this.session.usuario()?.id;
    const fechaPago = dateToIso(this.fechaPago);
    if (!this.instanciaId || !usuarioId || !this.archivoObligacion || !this.montoPagado || !fechaPago) return;

    this.guardando.set(true);
    this.api
      .registrarPago(this.instanciaId, { usuarioPagoId: usuarioId, fechaPago, montoPagado: this.montoPagado }, this.archivoObligacion)
      .subscribe({
        next: () => {
          this.snackBar.open('Pago registrado', 'Cerrar', { duration: 4000 });
          this.reiniciarObligacion();
          this.cargarPendientes();
        },
        error: () => {
          this.guardando.set(false);
          this.snackBar.open('No se pudo registrar el pago', 'Cerrar', { duration: 5000 });
        },
      });
  }

  registrarGasto(): void {
    const fecha = dateToIso(this.fechaGasto);
    if (!this.categoriaId || !this.archivoGasto || !this.montoGasto || !fecha) return;

    this.guardando.set(true);
    this.api
      .crearGastoRapido(
        { categoriaId: this.categoriaId, montoTotal: this.montoGasto, fecha, descripcion: this.descripcionGasto },
        this.archivoGasto,
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Gasto registrado', 'Cerrar', { duration: 4000 });
          this.reiniciarGasto();
        },
        error: () => {
          this.guardando.set(false);
          this.snackBar.open('No se pudo registrar el gasto', 'Cerrar', { duration: 5000 });
        },
      });
  }

  private cargarPendientes(): void {
    this.api.instancias(undefined, 'pendiente').subscribe((pendientes) => this.pendientes.set(pendientes));
  }

  private reiniciarObligacion(): void {
    this.instanciaId = '';
    this.fechaPago = null;
    this.montoPagado = null;
    this.archivoObligacion = null;
    this.guardando.set(false);
    this.ocrFallo.set(false);
  }

  private reiniciarGasto(): void {
    this.montoGasto = null;
    this.fechaGasto = null;
    this.descripcionGasto = '';
    this.archivoGasto = null;
    this.guardando.set(false);
    this.ocrFallo.set(false);
  }
}
