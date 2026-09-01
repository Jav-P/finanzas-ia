import { Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter } from 'rxjs';
import { SessionService } from './core/session.service';
import { NotificationService } from './core/notification.service';

const RUTAS_MENU_MAS = ['/analisis', '/ingresos', '/creditos', '/catalogos', '/invitar'];

@Component({
  imports: [RouterModule, MatIconModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly session = inject(SessionService);
  protected readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly menuAbierto = signal(false);
  private readonly rutaActual = signal(this.router.url);

  constructor() {
    effect(() => {
      const mensaje = this.notification.mensaje();
      if (mensaje) {
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
        this.notification.cerrar();
      }
    });

    effect(() => {
      document.body.style.overflow = this.menuAbierto() ? 'hidden' : '';
    });

    this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe((evento) => {
        this.rutaActual.set(evento.urlAfterRedirects);
        this.menuAbierto.set(false);
      });
  }

  async cerrarSesion(): Promise<void> {
    this.menuAbierto.set(false);
    await this.session.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  protected toggleMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected esRutaDelMenuMas(): boolean {
    const ruta = this.rutaActual();
    return RUTAS_MENU_MAS.some((prefijo) => ruta.startsWith(prefijo));
  }

  protected iniciales(): string {
    const nombre = this.session.usuario()?.nombre?.trim();
    if (!nombre) return '?';
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('');
  }
}
