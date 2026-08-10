import { Component, effect, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionService } from './core/session.service';
import { NotificationService } from './core/notification.service';

@Component({
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly session = inject(SessionService);
  protected readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    effect(() => {
      const mensaje = this.notification.mensaje();
      if (mensaje) {
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
        this.notification.cerrar();
      }
    });
  }

  async cerrarSesion(): Promise<void> {
    await this.session.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
