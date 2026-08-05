import { Injectable, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import type { CompletarRegistroDto, Usuario } from '@finanzas-ia/shared-types';
import { supabase } from './supabase-client';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);

  // null mientras se restaura la sesion al arrancar la app.
  readonly session = signal<Session | null | undefined>(undefined);
  // Fila en nuestra tabla `usuarios`. null = tiene sesion de Supabase
  // Auth pero todavia no completo el registro.
  readonly usuario = signal<Usuario | null>(null);
  // Miembros del hogar actual (incluye a quien esta logueado); vacio
  // mientras no tenga hogar.
  readonly miembrosHogar = signal<Usuario[]>([]);
  // true apenas se resolvio sesion + usuario por primera vez (los
  // guards de rutas esperan esto antes de decidir).
  readonly listo = signal(false);

  constructor() {
    supabase.auth.getSession().then(({ data }) => this.onSessionChange(data.session));
    supabase.auth.onAuthStateChange((_event, session) => this.onSessionChange(session));
  }

  private async onSessionChange(session: Session | null): Promise<void> {
    this.session.set(session);
    if (!session) {
      this.usuario.set(null);
      this.miembrosHogar.set([]);
      this.listo.set(true);
      return;
    }
    await this.refrescarUsuario();
    this.listo.set(true);
  }

  async refrescarUsuario(): Promise<void> {
    const usuario = await firstValueFrom(this.api.usuarioYo());
    this.usuario.set(usuario);
    if (usuario?.hogarId) {
      const miembros = await firstValueFrom(this.api.usuarios());
      this.miembrosHogar.set(miembros);
    } else {
      this.miembrosHogar.set([]);
    }
  }

  async registrarse(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // No esperamos al evento onAuthStateChange (podria llegar despues
    // de que el caller ya intente llamar al backend): fijamos la
    // sesion ya mismo para que el interceptor tenga el token al toque.
    await this.onSessionChange(data.session);
  }

  async iniciarSesion(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.onSessionChange(data.session);
  }

  async cerrarSesion(): Promise<void> {
    await supabase.auth.signOut();
  }

  async completarRegistro(dto: CompletarRegistroDto): Promise<void> {
    await firstValueFrom(this.api.completarRegistro(dto));
    await this.refrescarUsuario();
  }
}
