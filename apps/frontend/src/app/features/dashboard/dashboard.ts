import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  imports: [RouterLink, DecimalPipe, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
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

  // Posicion (0-100) de la barra de urgencia: cuanto mas cerca del
  // vencimiento (o ya vencida), mas llena y mas corrida hacia el
  // extremo magenta del degradado cian -> violeta -> magenta.
  urgenciaPct(instancia: InstanciaConDetalle): number {
    const estado = this.semaforo(instancia);
    if (estado === 'vencido') return 100;
    const dias = diasRestantes(instancia.fechaVencimiento);
    if (estado === 'proximo') {
      const clamped = Math.max(0, Math.min(5, dias));
      return Math.round(90 - clamped * 11);
    }
    return Math.max(8, Math.round(22 - Math.max(0, dias) * 0.15));
  }

  urgenciaClase(instancia: InstanciaConDetalle): 'safe' | 'soon' | 'due' {
    const estado = this.semaforo(instancia);
    if (estado === 'vencido') return 'due';
    if (estado === 'proximo') return 'soon';
    return 'safe';
  }

  urgenciaLabel(instancia: InstanciaConDetalle): string {
    const dias = diasRestantes(instancia.fechaVencimiento);
    if (dias < 0) {
      const atraso = Math.abs(dias);
      return `Vencida hace ${atraso} día${atraso === 1 ? '' : 's'}`;
    }
    if (dias === 0) return 'Vence hoy';
    return `Vence en ${dias} día${dias === 1 ? '' : 's'}`;
  }

  inicialesDe(nombre: string): string {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('') || '?';
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
