import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-olvide-password',
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './olvide-password.html',
})
export class OlvidePassword {
  private readonly api = inject(ApiService);

  protected email = '';
  protected readonly enviando = signal(false);
  // No distingue si el correo existe o no (lo mismo que hace el
  // backend): siempre termina mostrando este mismo mensaje generico.
  protected readonly enviado = signal(false);

  enviar(): void {
    if (!this.email) return;

    this.enviando.set(true);
    this.api.olvidePassword({ email: this.email }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
    });
  }
}
