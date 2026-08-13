import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import type { Ingreso, Recurrencia } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { dateToIso } from '../../core/date-utils';

@Component({
  selector: 'app-ingresos',
  imports: [
    FormsModule,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MontoInputDirective,
  ],
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
  protected fechaInicio: Date | null = new Date();

  protected readonly editandoId = signal<string | null>(null);
  protected descripcionEdit = '';
  protected montoEdit: number | null = null;

  constructor() {
    effect(() => {
      const miembros = this.session.miembrosHogar();
      if (miembros.length && !this.usuarioId) {
        this.usuarioId = miembros[0].id;
      }
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  nombreUsuario(usuarioId: string): string {
    return this.session.miembrosHogar().find((u) => u.id === usuarioId)?.nombre ?? '—';
  }

  guardar(): void {
    const fechaInicio = dateToIso(this.fechaInicio);
    if (!this.usuarioId || !this.descripcion || !this.monto || !fechaInicio) return;

    this.guardando.set(true);
    this.api
      .crearIngreso({
        usuarioId: this.usuarioId,
        descripcion: this.descripcion,
        monto: this.monto,
        periodicidad: this.periodicidad,
        diaPago: this.periodicidad === 'mensual' ? this.diaPago : null,
        fechaInicio,
      })
      .subscribe(() => {
        this.descripcion = '';
        this.monto = null;
        this.guardando.set(false);
        this.cargar();
      });
  }

  editar(ingreso: Ingreso): void {
    this.editandoId.set(ingreso.id);
    this.descripcionEdit = ingreso.descripcion;
    this.montoEdit = ingreso.monto;
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(id: string): void {
    if (!this.descripcionEdit || !this.montoEdit) return;
    this.api
      .editarIngreso(id, { descripcion: this.descripcionEdit, monto: this.montoEdit })
      .subscribe(() => {
        this.editandoId.set(null);
        this.cargar();
      });
  }

  eliminar(id: string): void {
    this.api.eliminarIngreso(id).subscribe(() => this.cargar());
  }

  private cargar(): void {
    this.api.ingresos().subscribe((ingresos) => this.ingresos.set(ingresos));
  }
}
