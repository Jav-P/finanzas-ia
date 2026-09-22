import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
type TipoPago = 'completo' | 'parcial';

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
    MatButtonToggleModule,
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
  protected readonly instanciaId = signal('');
  protected readonly tipoPago = signal<TipoPago>('completo');
  protected fechaPago: Date | null = null;
  protected montoPagado: number | null = null;
  protected archivoObligacion: File | null = null;

  protected readonly instanciaSeleccionada = computed(
    () => this.pendientes().find((i) => i.id === this.instanciaId()) ?? null,
  );

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

  seleccionarInstancia(id: string): void {
    this.instanciaId.set(id);
    this.tipoPago.set('completo');
    const instancia = this.pendientes().find((i) => i.id === id);
    this.montoPagado = instancia?.saldoPendienteDePago ?? null;
  }

  elegirTipoPago(tipo: TipoPago): void {
    this.tipoPago.set(tipo);
    const instancia = this.instanciaSeleccionada();
    if (tipo === 'completo' && instancia) {
      this.montoPagado = instancia.saldoPendienteDePago;
    }
  }

  // El monto no puede superar lo que falta por pagar: se puede dividir
  // el pago en varios comprobantes, pero entre todos no deben sumar
  // más que el total de la obligación.
  excedeSaldo(): boolean {
    const instancia = this.instanciaSeleccionada();
    if (!instancia || this.montoPagado == null) return false;
    return this.montoPagado > instancia.saldoPendienteDePago;
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
    const instanciaId = this.instanciaId();
    if (!instanciaId || !usuarioId || !this.archivoObligacion || !this.montoPagado || !fechaPago) return;
    if (this.excedeSaldo()) return;

    this.guardando.set(true);
    this.api
      .registrarPago(instanciaId, { usuarioPagoId: usuarioId, fechaPago, montoPagado: this.montoPagado }, this.archivoObligacion)
      .subscribe({
        next: () => {
          this.snackBar.open('Pago registrado', 'Cerrar', { duration: 4000 });
          this.despuesDeRegistrarPago(instanciaId);
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.snackBar.open(err.error?.message ?? 'No se pudo registrar el pago', 'Cerrar', { duration: 6000 });
        },
      });
  }

  registrarGasto(): void {
    const fecha = dateToIso(this.fechaGasto);
    if (!this.categoriaId || !this.archivoGasto || !this.montoGasto || !fecha) {
      const faltante = !this.archivoGasto
        ? 'el comprobante'
        : !this.categoriaId
          ? 'la categoría'
          : !this.montoGasto
            ? 'el monto'
            : 'la fecha';
      this.snackBar.open(`Falta ${faltante} para poder registrar el gasto`, 'Cerrar', { duration: 5000 });
      return;
    }

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

  // Tras registrar un comprobante, recarga las pendientes. Si la
  // obligacion pagada todavia tiene saldo (fue un pago parcial), la
  // deja seleccionada y lista para el siguiente comprobante; si ya
  // quedo saldada, limpia la seleccion.
  private despuesDeRegistrarPago(instanciaIdPagada: string): void {
    this.archivoObligacion = null;
    this.fechaPago = null;
    this.guardando.set(false);
    this.ocrFallo.set(false);

    this.api.instancias(undefined, 'pendiente').subscribe((pendientes) => {
      this.pendientes.set(pendientes);
      const sigueConSaldo = pendientes.find((i) => i.id === instanciaIdPagada);
      if (sigueConSaldo) {
        this.instanciaId.set(sigueConSaldo.id);
        this.tipoPago.set('completo');
        this.montoPagado = sigueConSaldo.saldoPendienteDePago;
      } else {
        this.instanciaId.set('');
        this.montoPagado = null;
        this.tipoPago.set('completo');
      }
    });
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
