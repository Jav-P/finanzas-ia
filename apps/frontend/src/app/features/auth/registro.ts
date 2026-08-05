import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { InvitacionPublica } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
})
export class Registro implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly invitacionToken = signal<string | null>(null);
  protected readonly invitacion = signal<InvitacionPublica | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected email = '';
  protected password = '';
  protected nombre = '';
  protected nombreHogar = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('invitacion');
    if (!token) return;

    this.invitacionToken.set(token);
    this.api.obtenerInvitacionPublica(token).subscribe({
      next: (invitacion) => {
        this.invitacion.set(invitacion);
        if (invitacion.email) this.email = invitacion.email;
      },
      error: () => this.error.set('Esta invitación ya no es válida.'),
    });
  }

  async registrar(): Promise<void> {
    if (!this.email || !this.password || !this.nombre) return;
    const token = this.invitacionToken();
    if (!token && !this.nombreHogar) {
      this.error.set('Ponle un nombre a tu hogar.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.session.registrarse(this.email, this.password);
      await this.session.completarRegistro(
        token ? { nombre: this.nombre, invitacionToken: token } : { nombre: this.nombre, nombreHogar: this.nombreHogar },
      );
      this.router.navigateByUrl(token ? `/invitacion/${token}` : '/dashboard');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo completar el registro');
    } finally {
      this.cargando.set(false);
    }
  }
}
