import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import type { InstanciaConDetalle } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { dateToIso } from '../../core/date-utils';

@Component({
  selector: 'app-obligacion-detalle',
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MontoInputDirective,
  ],
  templateUrl: './obligacion-detalle.html',
})
export class ObligacionDetalle implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly instancia = signal<InstanciaConDetalle | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fechaPago: Date | null = new Date();
  protected montoPagado: number | null = null;
  protected archivo: File | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargar(id);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
  }

  // El monto no puede superar lo que falta por pagar: se puede dividir
  // el pago en varios comprobantes, pero entre todos no deben sumar
  // más que el total de la obligación.
  excedeSaldo(): boolean {
    const instancia = this.instancia();
    if (!instancia || this.montoPagado == null) return false;
    return this.montoPagado > instancia.saldoPendienteDePago;
  }

  registrarPago(): void {
    const instancia = this.instancia();
    const usuarioId = this.session.usuario()?.id;
    const fechaPago = dateToIso(this.fechaPago);
    if (!instancia || !usuarioId || !this.archivo || !this.montoPagado || !fechaPago) return;
    if (this.excedeSaldo()) return;

    this.guardando.set(true);
    this.error.set(null);
    this.api
      .registrarPago(
        instancia.id,
        { usuarioPagoId: usuarioId, fechaPago, montoPagado: this.montoPagado },
        this.archivo,
      )
      .subscribe({
        next: () => this.cargar(instancia.id),
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.error.set(err.error?.message ?? 'No se pudo registrar el pago.');
        },
      });
  }

  volver(): void {
    this.router.navigateByUrl('/dashboard');
  }

  revertirPago(pagoId: string): void {
    const instancia = this.instancia();
    if (!instancia) return;
    this.api.revertirPago(instancia.id, pagoId).subscribe(() => this.cargar(instancia.id));
  }

  desactivarObligacion(): void {
    const instancia = this.instancia();
    if (!instancia) return;
    this.api.desactivarObligacion(instancia.obligacion.id).subscribe(() => this.cargar(instancia.id));
  }

  eliminarObligacion(): void {
    const instancia = this.instancia();
    if (!instancia) return;
    this.api.eliminarObligacion(instancia.obligacion.id).subscribe(() => this.router.navigateByUrl('/dashboard'));
  }

  private cargar(id: string): void {
    this.api.instancia(id).subscribe((instancia) => {
      this.instancia.set(instancia);
      this.montoPagado = instancia.saldoPendienteDePago;
      this.archivo = null;
      this.guardando.set(false);
    });
  }
}
