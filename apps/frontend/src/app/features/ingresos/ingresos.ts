import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Ingreso, Recurrencia } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-ingresos',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './ingresos.html',
})
export class Ingresos implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);

  protected readonly ingresos = signal<Ingreso[]>([]);
  protected readonly guardando = signal(false);

  protected usuarioId = '';
  protected descripcion = '';
  protected monto: number | null = null;
  protected periodicidad: Recurrencia = 'mensual';
  protected diaPago: number | null = null;
  protected fechaInicio = new Date().toISOString().slice(0, 10);

  constructor() {
    effect(() => {
      const usuarios = this.session.usuarios();
      if (usuarios.length && !this.usuarioId) {
        this.usuarioId = usuarios[0].id;
      }
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  nombreUsuario(usuarioId: string): string {
    return this.session.usuarios().find((u) => u.id === usuarioId)?.nombre ?? '—';
  }

  guardar(): void {
    if (!this.usuarioId || !this.descripcion || !this.monto || !this.fechaInicio) return;

    this.guardando.set(true);
    this.api
      .crearIngreso({
        hogarId: this.session.hogarId,
        usuarioId: this.usuarioId,
        descripcion: this.descripcion,
        monto: this.monto,
        periodicidad: this.periodicidad,
        diaPago: this.periodicidad === 'mensual' ? this.diaPago : null,
        fechaInicio: this.fechaInicio,
      })
      .subscribe(() => {
        this.descripcion = '';
        this.monto = null;
        this.guardando.set(false);
        this.cargar();
      });
  }

  private cargar(): void {
    this.api.ingresos(this.session.hogarId).subscribe((ingresos) => this.ingresos.set(ingresos));
  }
}
