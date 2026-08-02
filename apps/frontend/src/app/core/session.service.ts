import { Injectable, signal } from '@angular/core';
import type { Usuario } from '@finanzas-ia/shared-types';
import { HOGAR_ID } from './config';

const STORAGE_KEY = 'finanzas-ia:usuarioId';

// Reemplaza el login real (Supabase Auth) mientras no esta conectado:
// eliges quien eres de una lista fija de 2 personas del hogar.
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly hogarId = HOGAR_ID;
  readonly usuarios = signal<Usuario[]>([]);
  readonly usuarioActualId = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  setUsuarios(usuarios: Usuario[]): void {
    this.usuarios.set(usuarios);
  }

  elegirUsuario(usuarioId: string): void {
    localStorage.setItem(STORAGE_KEY, usuarioId);
    this.usuarioActualId.set(usuarioId);
  }

  cerrarSesion(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.usuarioActualId.set(null);
  }
}
