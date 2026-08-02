import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { InstanciaConDetalle } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-obligacion-detalle',
  imports: [FormsModule, DecimalPipe],
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

  protected fechaPago = new Date().toISOString().slice(0, 10);
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

  registrarPago(): void {
    const instancia = this.instancia();
    const usuarioId = this.session.usuarioActualId();
    if (!instancia || !usuarioId || !this.archivo || !this.montoPagado) return;

    this.guardando.set(true);
    this.error.set(null);
    this.api
      .registrarPago(
        instancia.id,
        { usuarioPagoId: usuarioId, fechaPago: this.fechaPago, montoPagado: this.montoPagado },
        this.archivo,
      )
      .subscribe({
        next: () => this.cargar(instancia.id),
        error: () => {
          this.guardando.set(false);
          this.error.set('No se pudo registrar el pago.');
        },
      });
  }

  volver(): void {
    this.router.navigateByUrl('/dashboard');
  }

  private cargar(id: string): void {
    this.api.instancia(id).subscribe((instancia) => {
      this.instancia.set(instancia);
      this.montoPagado = instancia.monto;
      this.guardando.set(false);
    });
  }
}
