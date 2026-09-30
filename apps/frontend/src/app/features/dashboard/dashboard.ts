import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Balance, Cuenta, IngresoPendiente, InstanciaConDetalle, Patrimonio, Recomendacion } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { MontoInputDirective } from '../../core/monto-input.directive';

const TODAS = 'todas' as const;

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function nombreMes(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function diasRestantes(fechaVencimiento: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento + 'T00:00:00');
  return Math.round((vencimiento.getTime() - hoy.getTime()) / 86_400_000);
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MontoInputDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly session = inject(SessionService);

  protected readonly balance = signal<Balance | null>(null);
  protected readonly patrimonio = signal<Patrimonio | null>(null);
  protected readonly recomendaciones = signal<Recomendacion[]>([]);
  protected readonly ingresosPendientes = signal<IngresoPendiente[]>([]);
  protected readonly cuentas = signal<Cuenta[]>([]);
  protected readonly confirmandoId = signal<string | null>(null);
  protected cuentaConfirmarId = '';
  protected montoConfirmar: number | null = null;

  // El mat-select del formulario de confirmar no puede vivir dentro del
  // @for de la lista (Angular Material no resuelve bien el control del
  // form-field cuando esta anidado en un @for + @if a la vez), asi que
  // el formulario se muestra una sola vez, fuera del @for, para el
  // ingreso que corresponda a confirmandoId().
  protected readonly ingresoConfirmando = computed(() => {
    const id = this.confirmandoId();
    return id ? (this.ingresosPendientes().find((i) => i.ingresoId + '|' + i.periodo === id) ?? null) : null;
  });
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
    this.api.recomendaciones(periodoActual()).subscribe((recomendaciones) => {
      this.recomendaciones.set(recomendaciones);
    });
    this.api.patrimonio().subscribe((patrimonio) => this.patrimonio.set(patrimonio));
    this.api.cuentas().subscribe((cuentas) => this.cuentas.set(cuentas));
    this.cargarIngresosPendientes();
  }

  prepararConfirmacion(ingreso: IngresoPendiente): void {
    this.confirmandoId.set(`${ingreso.ingresoId}|${ingreso.periodo}`);
    this.cuentaConfirmarId = this.cuentas()[0]?.id ?? '';
    this.montoConfirmar = ingreso.monto;
  }

  confirmarIngreso(ingreso: IngresoPendiente): void {
    if (!this.cuentaConfirmarId || !this.montoConfirmar) return;
    this.api
      .confirmarIngreso({
        ingresoId: ingreso.ingresoId,
        periodo: ingreso.periodo,
        cuentaId: this.cuentaConfirmarId,
        monto: this.montoConfirmar,
        fecha: ingreso.fechaEsperada,
      })
      .subscribe({
        next: () => {
          this.confirmandoId.set(null);
          this.cargarIngresosPendientes();
          this.api.patrimonio().subscribe((patrimonio) => this.patrimonio.set(patrimonio));
          this.api.cuentas().subscribe((cuentas) => this.cuentas.set(cuentas));
        },
        error: () => this.snackBar.open('No se pudo confirmar el ingreso', 'Cerrar', { duration: 5000 }),
      });
  }

  omitirIngreso(ingreso: IngresoPendiente): void {
    this.api.omitirIngreso({ ingresoId: ingreso.ingresoId, periodo: ingreso.periodo }).subscribe({
      next: () => this.cargarIngresosPendientes(),
      error: () => this.snackBar.open('No se pudo omitir el ingreso', 'Cerrar', { duration: 5000 }),
    });
  }

  private cargarIngresosPendientes(): void {
    this.api.ingresosPendientes().subscribe((pendientes) => this.ingresosPendientes.set(pendientes));
  }

  iconoSeveridad(severidad: Recomendacion['severidad']): string {
    if (severidad === 'critico') return 'error';
    if (severidad === 'alerta') return 'warning';
    return 'lightbulb';
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

  nombreMes(periodo: string): string {
    return nombreMes(periodo);
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
