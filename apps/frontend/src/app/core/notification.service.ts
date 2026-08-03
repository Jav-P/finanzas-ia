import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly mensaje = signal<string | null>(null);

  error(mensaje: string): void {
    this.mensaje.set(mensaje);
  }

  cerrar(): void {
    this.mensaje.set(null);
  }
}
