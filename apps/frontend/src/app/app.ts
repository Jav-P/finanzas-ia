import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SessionService } from './core/session.service';
import { NotificationService } from './core/notification.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly session = inject(SessionService);
  protected readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  async cerrarSesion(): Promise<void> {
    await this.session.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
