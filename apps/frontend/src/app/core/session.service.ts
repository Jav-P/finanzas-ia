import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CompletarRegistroDto, Hogar, SesionAuth, Usuario } from '@finanzas-ia/shared-types';
import { ApiService } from './api.service';

const STORAGE_KEY = 'finanzas-ia.sesion';
// Margen antes del vencimiento real para disparar la renovacion (y
// para decidir, al arrancar, si la sesion guardada ya esta vieja).
const MARGEN_SEGUNDOS = 60;

function leerSesionGuardada(): SesionAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SesionAuth;
  } catch {
    return null;
  }
}

// El front nunca habla con Supabase directo (ni Auth ni base de datos):
// todo pasa por el backend. Esta clase reemplaza lo que antes hacia el
// SDK de supabase-js (guardar sesion, renovarla sola con un timer).
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);
  private timerRefresco: ReturnType<typeof setTimeout> | null = null;

  // undefined mientras se restaura la sesion al arrancar la app.
  readonly sesion = signal<SesionAuth | null | undefined>(undefined);
  // Fila en nuestra tabla `usuarios`. null = tiene sesion pero todavia
  // no completo el registro.
  readonly usuario = signal<Usuario | null>(null);
  // Miembros del hogar actual (incluye a quien esta logueado); vacio
  // mientras no tenga hogar.
  readonly miembrosHogar = signal<Usuario[]>([]);
  readonly hogar = signal<Hogar | null>(null);
  // true apenas se resolvio sesion + usuario por primera vez (los
  // guards de rutas esperan esto antes de decidir).
  readonly listo = signal(false);

  constructor() {
    this.iniciar();
  }

  private async iniciar(): Promise<void> {
    const guardada = leerSesionGuardada();
    if (!guardada) {
      this.sesion.set(null);
      this.listo.set(true);
      return;
    }

    const ahora = Math.floor(Date.now() / 1000);
    if (guardada.expiresAt - ahora < MARGEN_SEGUNDOS) {
      // Ya vencida (o a punto): intenta renovarla antes de dar por
      // buena la sesion.
      const renovada = await this.intentarRefrescar(guardada.refreshToken);
      if (!renovada) {
        this.listo.set(true);
        return;
      }
    } else {
      this.guardarSesion(guardada);
    }

    await this.refrescarUsuario();
    this.listo.set(true);
  }

  async refrescarUsuario(): Promise<void> {
    const usuario = await firstValueFrom(this.api.usuarioYo());
    this.usuario.set(usuario);
    if (usuario?.hogarId) {
      const [miembros, hogar] = await Promise.all([
        firstValueFrom(this.api.usuarios()),
        firstValueFrom(this.api.hogarActual()),
      ]);
      this.miembrosHogar.set(miembros);
      this.hogar.set(hogar);
    } else {
      this.miembrosHogar.set([]);
      this.hogar.set(null);
    }
  }

  async registrarse(email: string, password: string): Promise<void> {
    const sesion = await firstValueFrom(this.api.signup({ email, password }));
    this.guardarSesion(sesion);
    await this.refrescarUsuario();
  }

  async iniciarSesion(email: string, password: string): Promise<void> {
    const sesion = await firstValueFrom(this.api.login({ email, password }));
    this.guardarSesion(sesion);
    await this.refrescarUsuario();
  }

  async cerrarSesion(): Promise<void> {
    const actual = this.sesion();
    this.limpiarSesion();
    if (actual) {
      try {
        await firstValueFrom(this.api.logout(actual.accessToken));
      } catch {
        // Best effort: la sesion local ya se borro de todas formas.
      }
    }
  }

  async completarRegistro(dto: CompletarRegistroDto): Promise<void> {
    await firstValueFrom(this.api.completarRegistro(dto));
    await this.refrescarUsuario();
  }

  private guardarSesion(sesion: SesionAuth): void {
    this.sesion.set(sesion);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    this.programarRefresco(sesion);
  }

  private limpiarSesion(): void {
    this.sesion.set(null);
    this.usuario.set(null);
    this.miembrosHogar.set([]);
    this.hogar.set(null);
    localStorage.removeItem(STORAGE_KEY);
    if (this.timerRefresco) {
      clearTimeout(this.timerRefresco);
      this.timerRefresco = null;
    }
  }

  private programarRefresco(sesion: SesionAuth): void {
    if (this.timerRefresco) clearTimeout(this.timerRefresco);
    const ahora = Math.floor(Date.now() / 1000);
    const esperaSegundos = Math.max(sesion.expiresAt - ahora - MARGEN_SEGUNDOS, 5);
    this.timerRefresco = setTimeout(() => this.intentarRefrescar(sesion.refreshToken), esperaSegundos * 1000);
  }

  private async intentarRefrescar(refreshToken: string): Promise<boolean> {
    try {
      const sesion = await firstValueFrom(this.api.refrescarSesion({ refreshToken }));
      this.guardarSesion(sesion);
      return true;
    } catch {
      this.limpiarSesion();
      return false;
    }
  }
}
