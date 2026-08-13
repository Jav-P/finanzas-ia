import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import type { Balance, InstanciaConDetalle } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

const TODAS = 'todas' as const;

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function diasRestantes(fechaVencimiento: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento + 'T00:00:00');
  return Math.round((vencimiento.getTime() - hoy.getTime()) / 86_400_000);
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);

  protected readonly balance = signal<Balance | null>(null);
  protected readonly instancias = signal<InstanciaConDetalle[]>([]);
  protected readonly viendoUsuarioId = signal<string | typeof TODAS | null>(null);
  protected readonly generando = signal(false);
  protected readonly mensajeGeneracion = signal<string | null>(null);

  protected readonly todas = TODAS;

  constructor() {
    effect(() => {
      const usuarioId = this.session.usuario()?.id;
      if (usuarioId && !this.viendoUsuarioId()) {
        this.viendoUsuarioId.set(usuarioId);
      }
    });

    effect(() => {
      const filtro = this.viendoUsuarioId();
      if (filtro) {
        this.cargarInstancias(filtro === TODAS ? undefined : filtro);
      }
    });
  }

  ngOnInit(): void {
    this.api.balance(periodoActual()).subscribe((balance) => {
      this.balance.set(balance);
    });
  }

  nombreResponsable(instancia: InstanciaConDetalle): string {
    const id = instancia.obligacion.usuarioResponsableId;
    if (!id) return 'Compartida';
    return this.session.miembrosHogar().find((u) => u.id === id)?.nombre ?? '—';
  }

  semaforo(instancia: InstanciaConDetalle): 'pendiente' | 'proximo' | 'vencido' | 'pagado' {
    if (instancia.estado === 'pagado') return 'pagado';
    if (instancia.estado === 'vencido') return 'vencido';
    return diasRestantes(instancia.fechaVencimiento) <= 5 ? 'proximo' : 'pendiente';
  }

  // Dispara a mano el generador de instancias (mensual/diaria) en vez
  // de esperar al cron diario; util mientras se prueba con una
  // obligacion "diaria".
  generarInstancias(): void {
    this.generando.set(true);
    this.mensajeGeneracion.set(null);
    this.api.generarInstanciasPendientes().subscribe((resultado) => {
      this.generando.set(false);
      this.mensajeGeneracion.set(
        `${resultado.instanciasCreadas} instancia(s) nueva(s) (de ${resultado.obligacionesRevisadas} obligaciones revisadas)`,
      );
      const filtro = this.viendoUsuarioId();
      if (filtro) this.cargarInstancias(filtro === TODAS ? undefined : filtro);
    });
  }

  private cargarInstancias(usuarioId?: string): void {
    this.api.instancias(usuarioId).subscribe((instancias) => {
      this.instancias.set(instancias);
    });
  }
}
