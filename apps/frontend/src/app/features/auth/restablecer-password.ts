import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-restablecer-password',
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './restablecer-password.html',
})
export class RestablecerPassword {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('token');

  protected passwordNueva = '';
  protected passwordConfirmar = '';
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listo = signal(false);
  protected readonly mostrarPassword = signal(false);

  guardar(): void {
    this.error.set(null);
    if (!this.token) {
      this.error.set('El enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?".');
      return;
    }
    if (!this.passwordNueva || !this.passwordConfirmar) return;

    if (this.passwordNueva.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.error.set('Las dos contraseñas no coinciden');
      return;
    }

    this.guardando.set(true);
    this.api.restablecerPassword({ token: this.token, passwordNueva: this.passwordNueva }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.listo.set(true);
        setTimeout(() => this.router.navigateByUrl('/login'), 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(err.error?.message ?? 'No se pudo restablecer la contraseña');
      },
    });
  }
}
