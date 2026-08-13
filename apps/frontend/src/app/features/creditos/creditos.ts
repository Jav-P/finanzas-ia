import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import type { CreditoResumen } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { MontoInputDirective } from '../../core/monto-input.directive';

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

  ngOnInit(): void {
    this.cargar();
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
