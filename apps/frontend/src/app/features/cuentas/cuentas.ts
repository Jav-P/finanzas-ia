import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Cuenta, Patrimonio, TipoCuenta } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';

const ETIQUETA_TIPO_CUENTA: Record<TipoCuenta, string> = {
  efectivo: 'Efectivo',
  ahorros: 'Cuenta de ahorros',
  bolsillo: 'Bolsillo',
  tarjeta_credito: 'Tarjeta de crédito',
};

@Component({
  selector: 'app-cuentas',
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MontoInputDirective,
  ],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.scss',
})
export class Cuentas implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly etiquetaTipo = ETIQUETA_TIPO_CUENTA;
  protected readonly cuentas = signal<Cuenta[]>([]);
  protected readonly patrimonio = signal<Patrimonio | null>(null);
  protected readonly guardando = signal(false);
  protected readonly mostrarForm = signal(false);

  protected tipo: TipoCuenta = 'ahorros';
  protected nombre = '';
  protected cuentaPadreId = '';
  protected saldo: number | null = null;

  protected readonly editandoId = signal<string | null>(null);
  protected saldoEdit: number | null = null;

  protected readonly cuentasAhorros = computed(() => this.cuentas().filter((c) => c.tipo === 'ahorros'));

  // Lo que se tiene (cada cuenta seguida de sus bolsillos) y lo que se debe.
  protected readonly grupos = computed(() => {
    const todas = this.cuentas();
    return [
      {
        titulo: 'Lo que tengo',
        cuentas: todas
          .filter((c) => c.tipo === 'efectivo' || c.tipo === 'ahorros')
          .flatMap((c) => [c, ...todas.filter((b) => b.cuentaPadreId === c.id)]),
      },
      { titulo: 'Tarjetas de crédito', cuentas: todas.filter((c) => c.tipo === 'tarjeta_credito') },
    ].filter((g) => g.cuentas.length);
  });

  ngOnInit(): void {
    this.cargar();
  }

  abrirForm(): void {
    this.tipo = 'ahorros';
    this.nombre = '';
    this.cuentaPadreId = '';
    this.saldo = null;
    this.mostrarForm.set(true);
  }

  guardar(): void {
    if (!this.nombre || (this.tipo === 'bolsillo' && !this.cuentaPadreId)) return;

    this.guardando.set(true);
    this.api
      .crearCuenta({
        nombre: this.nombre,
        tipo: this.tipo,
        cuentaPadreId: this.tipo === 'bolsillo' ? this.cuentaPadreId : null,
        saldo: this.saldo ?? 0,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarForm.set(false);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo crear la cuenta'),
      });
  }

  editarSaldo(cuenta: Cuenta): void {
    this.editandoId.set(cuenta.id);
    this.saldoEdit = cuenta.saldo;
  }

  guardarSaldo(id: string): void {
    if (this.saldoEdit == null) return;
    this.guardando.set(true);
    this.api.editarCuenta(id, { saldo: this.saldoEdit }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editandoId.set(null);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo actualizar el saldo'),
    });
  }

  eliminar(cuenta: Cuenta): void {
    if (!confirm(`¿Eliminar "${cuenta.nombre}"?`)) return;
    this.api.eliminarCuenta(cuenta.id).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.mostrarError(err, 'No se pudo eliminar la cuenta'),
    });
  }

  private mostrarError(err: HttpErrorResponse, porDefecto: string): void {
    this.guardando.set(false);
    this.snackBar.open(err.error?.message ?? porDefecto, 'Cerrar', { duration: 6000 });
  }

  private cargar(): void {
    this.api.cuentas().subscribe((cuentas) => this.cuentas.set(cuentas));
    this.api.patrimonio().subscribe((patrimonio) => this.patrimonio.set(patrimonio));
  }
}
