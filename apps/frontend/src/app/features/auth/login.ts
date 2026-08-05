import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  async ingresar(): Promise<void> {
    if (!this.email || !this.password) return;

    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.session.iniciarSesion(this.email, this.password);
      this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      this.cargando.set(false);
    }
  }
}
