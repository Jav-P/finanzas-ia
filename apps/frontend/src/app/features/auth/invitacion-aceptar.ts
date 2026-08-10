import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import type { InvitacionPublica } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-invitacion-aceptar',
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './invitacion-aceptar.html',
})
export class InvitacionAceptar implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly invitacion = signal<InvitacionPublica | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly procesando = signal(false);
  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.api.obtenerInvitacionPublica(this.token).subscribe({
      next: (invitacion) => this.invitacion.set(invitacion),
      error: () => this.error.set('Esta invitación ya no está disponible.'),
    });
  }

  aceptar(): void {
    this.procesando.set(true);
    this.api.aceptarInvitacion(this.token).subscribe({
      next: async () => {
        await this.session.refrescarUsuario();
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo aceptar la invitación.');
      },
    });
  }

  rechazar(): void {
    this.procesando.set(true);
    this.api.rechazarInvitacion(this.token).subscribe({
      next: () => this.router.navigateByUrl('/sin-hogar'),
      error: () => {
        this.procesando.set(false);
        this.error.set('No se pudo rechazar la invitación.');
      },
    });
  }
}
