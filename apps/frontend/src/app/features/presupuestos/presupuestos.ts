import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
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
  protected readonly presupuestoIdPorCategoria = signal<Map<string, string>>(new Map());

  protected categoriaId = '';
  protected montoPresupuestado: number | null = null;

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
      })
      .subscribe(() => {
        this.montoPresupuestado = null;
        this.guardando.set(false);
        this.cargar();
      });
  }

  eliminarPresupuesto(categoriaId: string): void {
    const id = this.presupuestoIdPorCategoria().get(categoriaId);
    if (!id) return;
    this.api.eliminarPresupuesto(id).subscribe(() => this.cargar());
  }

  private cargar(): void {
    this.api.presupuestosResumen(this.periodo()).subscribe((resumen) => this.resumen.set(resumen));

    this.api.presupuestos(this.periodo()).subscribe((presupuestos) => {
      this.presupuestoIdPorCategoria.set(new Map(presupuestos.map((p) => [p.categoriaId, p.id])));
    });
  }
}
