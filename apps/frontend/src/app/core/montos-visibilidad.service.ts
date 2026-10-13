import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'finanzas-ia.montosVisibles';

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

// Preferencia global (no solo del Dashboard): oculta montos sensibles
// con un toggle que se recuerda entre sesiones, para no mostrar el
// saldo apenas se abre la app en un lugar publico.
@Injectable({ providedIn: 'root' })
export class MontosVisibilidadService {
  readonly visible = signal(leerPreferencia());

  toggle(): void {
    const nuevo = !this.visible();
    this.visible.set(nuevo);
    try {
      localStorage.setItem(STORAGE_KEY, String(nuevo));
    } catch {
      // best effort: si localStorage no esta disponible, igual cambia en memoria
    }
  }
}
