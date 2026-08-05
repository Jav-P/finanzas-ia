import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { InvitacionCreada } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';

type Modo = 'link' | 'email';

@Component({
  selector: 'app-invitaciones',
  imports: [FormsModule],
  templateUrl: './invitaciones.html',
})
export class Invitaciones {
  private readonly api = inject(ApiService);

  protected modo: Modo = 'link';
  protected email = '';
  protected readonly generando = signal(false);
  protected readonly resultado = signal<InvitacionCreada | null>(null);
  protected readonly copiado = signal(false);

  generar(): void {
    if (this.modo === 'email' && !this.email) return;

    this.generando.set(true);
    this.resultado.set(null);
    this.copiado.set(false);
    this.api.crearInvitacion({ email: this.modo === 'email' ? this.email : undefined }).subscribe({
      next: (invitacion) => {
        this.generando.set(false);
        this.resultado.set(invitacion);
        this.email = '';
      },
      error: () => this.generando.set(false),
    });
  }

  copiarLink(): void {
    const link = this.resultado()?.link;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }
}
