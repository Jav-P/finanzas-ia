import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import type { CreditoResumen } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';

type ColumnaOrden =
  | 'banco'
  | 'descripcion'
  | 'categoria'
  | 'montoCuota'
  | 'tasaInteres'
  | 'cuotasRestantes'
  | 'proximaFechaVencimiento'
  | 'saldoPendiente';

@Component({
  selector: 'app-creditos',
  imports: [DecimalPipe, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MontoInputDirective],
  templateUrl: './creditos.html',
})
export class Creditos implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly creditos = signal<CreditoResumen[]>([]);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected saldoEdit: number | null = null;

  protected readonly ordenColumna = signal<ColumnaOrden | null>(null);
  protected readonly ordenAscendente = signal(true);

  protected readonly creditosOrdenados = computed(() => {
    const columna = this.ordenColumna();
    const lista = [...this.creditos()];
    if (!columna) return lista;

    const factor = this.ordenAscendente() ? 1 : -1;
    return lista.sort((a, b) => {
      const va = this.valorColumna(a, columna);
      const vb = this.valorColumna(b, columna);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // sin dato: siempre al final, sin importar el sentido
      if (vb == null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, 'es', { sensitivity: 'base' }) * factor;
      }
      return ((va as number) - (vb as number)) * factor;
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  ordenarPor(columna: ColumnaOrden): void {
    if (this.ordenColumna() === columna) {
      this.ordenAscendente.set(!this.ordenAscendente());
    } else {
      this.ordenColumna.set(columna);
      this.ordenAscendente.set(true);
    }
  }

  indicadorOrden(columna: ColumnaOrden): string {
    if (this.ordenColumna() !== columna) return '';
    return this.ordenAscendente() ? '▲' : '▼';
  }

  private valorColumna(credito: CreditoResumen, columna: ColumnaOrden): string | number | null {
    switch (columna) {
      case 'banco':
        return credito.banco ?? '';
      case 'descripcion':
        return credito.descripcion;
      case 'categoria':
        return credito.categoriaNombre;
      case 'montoCuota':
        return credito.montoCuota;
      case 'tasaInteres':
        return credito.tasaInteres;
      case 'cuotasRestantes':
        return credito.cuotasRestantes;
      case 'proximaFechaVencimiento':
        return credito.proximaFechaVencimiento;
      case 'saldoPendiente':
        return credito.saldoPendiente;
    }
  }

  editarSaldo(credito: CreditoResumen): void {
    this.editandoId.set(credito.obligacionId);
    this.saldoEdit = credito.saldoPendiente;
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarSaldo(obligacionId: string): void {
    if (this.saldoEdit == null) return;
    this.guardando.set(true);
    this.api.actualizarSaldoCredito(obligacionId, { saldoPendiente: this.saldoEdit }).subscribe(() => {
      this.guardando.set(false);
      this.editandoId.set(null);
      this.cargar();
    });
  }

  private cargar(): void {
    this.api.creditos().subscribe((creditos) => this.creditos.set(creditos));
  }
}
