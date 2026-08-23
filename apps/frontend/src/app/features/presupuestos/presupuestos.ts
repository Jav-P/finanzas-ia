import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { Categoria, PresupuestoResumenItem } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-presupuestos',
  imports: [
    FormsModule,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MontoInputDirective,
  ],
  templateUrl: './presupuestos.html',
})
export class Presupuestos implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly periodo = signal(periodoActual());
  protected readonly resumen = signal<PresupuestoResumenItem[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);

  protected categoriaId = '';
  protected montoPresupuestado: number | null = null;
  protected esFijo = false;

  ngOnInit(): void {
    this.api.categorias().subscribe((categorias) => {
      this.categorias.set(categorias);
      if (categorias.length) this.categoriaId = categorias[0].id;
    });
    this.cargar();
  }

  cambiarPeriodo(event: Event): void {
    this.periodo.set((event.target as HTMLInputElement).value);
    this.cargar();
  }

  guardar(): void {
    if (!this.categoriaId || this.montoPresupuestado == null) return;

    this.guardando.set(true);
    this.api
      .guardarPresupuesto({
        categoriaId: this.categoriaId,
        periodo: this.periodo(),
        montoPresupuestado: this.montoPresupuestado,
        esFijo: this.esFijo,
      })
      .subscribe(() => {
        this.montoPresupuestado = null;
        this.esFijo = false;
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.cargar();
      });
  }

  eliminarPresupuesto(presupuestoId: string | null): void {
    if (!presupuestoId) return;
    this.api.eliminarPresupuesto(presupuestoId).subscribe(() => this.cargar());
  }

  private cargar(): void {
    this.api.presupuestosResumen(this.periodo()).subscribe((resumen) => this.resumen.set(resumen));
  }
}
