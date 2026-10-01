import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-cambiar-password',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.scss',
})
export class CambiarPassword {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected passwordActual = '';
  protected passwordNueva = '';
  protected passwordConfirmar = '';
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mostrarActual = signal(false);
  protected readonly mostrarNueva = signal(false);

  guardar(): void {
    this.error.set(null);
    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) return;

    if (this.passwordNueva.length < 6) {
      this.error.set('La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.error.set('Las dos contraseñas nuevas no coinciden');
      return;
    }

    this.guardando.set(true);
    this.api.cambiarPassword({ passwordActual: this.passwordActual, passwordNueva: this.passwordNueva }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.passwordActual = '';
        this.passwordNueva = '';
        this.passwordConfirmar = '';
        this.snackBar.open('Contraseña actualizada', 'Cerrar', { duration: 4000 });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(err.error?.message ?? 'No se pudo cambiar la contraseña');
      },
    });
  }
}
