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
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import type { Categoria, PresupuestoResumenItem } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';
import { FORMATO_MES_ANIO, periodoActual, periodoDe, periodoMasMeses } from '../../core/mes-anio-formats';

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
    MatDatepickerModule,
    MontoInputDirective,
  ],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATO_MES_ANIO }],
  templateUrl: './presupuestos.html',
})
export class Presupuestos implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly periodo = signal(periodoActual());
  protected readonly resumen = signal<PresupuestoResumenItem[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);
  protected readonly editando = signal(false);

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

  periodoFecha(): Date {
    const [anio, mes] = this.periodo().split('-').map(Number);
    return new Date(anio, mes - 1, 1);
  }

  seleccionarMes(fecha: Date, datepicker: MatDatepicker<Date>): void {
    this.periodo.set(periodoDe(fecha));
    this.cargar();
    datepicker.close();
  }

  mesAnterior(): void {
    this.periodo.set(periodoMasMeses(this.periodo(), -1));
    this.cargar();
  }

  mesSiguiente(): void {
    this.periodo.set(periodoMasMeses(this.periodo(), 1));
    this.cargar();
  }

  nuevoPresupuesto(): void {
    this.categoriaId = this.categorias()[0]?.id ?? '';
    this.montoPresupuestado = null;
    this.esFijo = false;
    this.editando.set(false);
    this.mostrarForm.set(true);
  }

  editarPresupuesto(item: PresupuestoResumenItem): void {
    this.categoriaId = item.categoriaId;
    this.montoPresupuestado = item.presupuestado;
    this.esFijo = item.esFijo;
    this.editando.set(true);
    this.mostrarForm.set(true);
  }

  cancelar(): void {
    this.editando.set(false);
    this.mostrarForm.set(false);
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
        this.editando.set(false);
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
