import { Injectable } from '@nestjs/common';
import type {
  Balance,
  CreditoResumen,
  PresupuestoResumenItem,
  Recomendacion,
} from '@finanzas-ia/shared-types';
import { BalanceService } from '../balance/balance.service';
import { PresupuestosService } from '../presupuestos/presupuestos.service';
import { ObligacionesService } from '../obligaciones/obligaciones.service';
import { periodLabel } from '../common/period';

function money(monto: number): string {
  return Math.round(monto).toLocaleString('es-CO');
}

function pct(proporcion: number): string {
  return `${Math.round(proporcion * 100)}%`;
}

// Umbrales del motor de reglas. Sin IA de por medio: son heuristicas
// fijas sobre lo que ya calculan Balance y Presupuestos. La idea es que
// mas adelante una capa de IA pueda leer estos mismos datos (o
// reemplazar/enriquecer este motor) sin cambiar el contrato de salida.
const MARGEN_BAJO = 0.1;
const MARGEN_BUENO = 0.2;
const OBLIGACIONES_ALTAS = 0.5;

@Injectable()
export class RecomendacionesService {
  constructor(
    private readonly balanceService: BalanceService,
    private readonly presupuestosService: PresupuestosService,
    private readonly obligacionesService: ObligacionesService,
  ) {}

  async generar(hogarId: string, periodo: string): Promise<Recomendacion[]> {
    const balance = await this.balanceService.calcular(hogarId, periodo);

    const [resumenPresupuestos, creditos] = await Promise.all([
      this.presupuestosService.resumen(hogarId, periodo),
      this.obligacionesService.listCreditos(hogarId),
    ]);

    const recomendaciones: Recomendacion[] = [];
    this.evaluarDisponible(balance, recomendaciones);
    this.evaluarPresupuestosExcedidos(resumenPresupuestos, recomendaciones);
    this.evaluarGastosSinPresupuesto(resumenPresupuestos, recomendaciones);
    this.evaluarObligacionesAltas(balance, recomendaciones);
    this.evaluarPrioridadCreditos(balance, creditos, recomendaciones);

    return recomendaciones;
  }

  private evaluarDisponible(balance: Balance, out: Recomendacion[]): void {
    const { disponibleParaCreditos, ingresos, periodo, periodoObligacionesProyectadas } = balance;
    if (ingresos <= 0) return;

    const proporcion = disponibleParaCreditos / ingresos;
    const mesDestino = periodLabel(periodoObligacionesProyectadas);
    const mesSueldo = periodLabel(periodo);

    if (disponibleParaCreditos < 0) {
      out.push({
        id: 'disponible-negativo',
        severidad: 'critico',
        titulo: 'El sueldo de este mes no alcanza',
        detalle:
          `Con el sueldo de ${mesSueldo} no cubres las obligaciones fijas de ${mesDestino} mas los ` +
          `presupuestos (tarjeta de credito) de ${mesSueldo}: faltan ${money(-disponibleParaCreditos)}. ` +
          `Antes de que lleguen esos vencimientos, revisa que presupuestos variables puedes recortar o ` +
          `si hay alguna obligacion para renegociar.`,
      });
      return;
    }

    if (proporcion < MARGEN_BAJO) {
      out.push({
        id: 'margen-bajo',
        severidad: 'alerta',
        titulo: 'Vas a quedar con poco margen',
        detalle:
          `Despues de cubrir las obligaciones fijas de ${mesDestino} y los presupuestos de ${mesSueldo} ` +
          `te quedan ${money(disponibleParaCreditos)} (${pct(proporcion)} del sueldo de ${mesSueldo}). ` +
          `Antes de sumar gastos nuevos conviene tener mas colchon.`,
      });
      return;
    }

    if (proporcion > MARGEN_BUENO) {
      out.push({
        id: 'buen-margen',
        severidad: 'info',
        titulo: 'Buen margen este mes',
        detalle:
          `Te quedan ${money(disponibleParaCreditos)} libres (${pct(proporcion)} del sueldo de ${mesSueldo}) ` +
          `despues de cubrir las obligaciones fijas de ${mesDestino} y los presupuestos de ${mesSueldo}. ` +
          `Es buen momento para abonar capital extra a tus creditos o alimentar un fondo de emergencia.`,
      });
    }
  }

  private evaluarPresupuestosExcedidos(items: PresupuestoResumenItem[], out: Recomendacion[]): void {
    for (const item of items) {
      if (!item.presupuestoId || item.gastado <= item.presupuestado) continue;
      const exceso = item.gastado - item.presupuestado;
      out.push({
        id: `excedido-${item.categoriaId}`,
        severidad: 'alerta',
        titulo: `Te pasaste en ${item.categoriaNombre}`,
        detalle: `Gastaste ${money(item.gastado)} contra ${money(item.presupuestado)} presupuestados: ${money(exceso)} de mas.`,
      });
    }
  }

  private evaluarGastosSinPresupuesto(items: PresupuestoResumenItem[], out: Recomendacion[]): void {
    for (const item of items) {
      if (item.presupuestoId || item.gastado <= 0) continue;
      out.push({
        id: `sin-presupuesto-${item.categoriaId}`,
        severidad: 'info',
        titulo: `${item.categoriaNombre} no tiene presupuesto`,
        detalle: `Ya llevas ${money(item.gastado)} gastados en ${item.categoriaNombre} sin un tope definido. Ponle un presupuesto para poder planearlo mejor.`,
      });
    }
  }

  private evaluarObligacionesAltas(balance: Balance, out: Recomendacion[]): void {
    if (balance.ingresos <= 0) return;
    const proporcion = balance.obligacionesProyectadas / balance.ingresos;
    if (proporcion <= OBLIGACIONES_ALTAS) return;

    out.push({
      id: 'obligaciones-altas',
      severidad: 'alerta',
      titulo: 'Tus obligaciones fijas son una porcion grande del sueldo',
      detalle:
        `Las obligaciones de ${periodLabel(balance.periodoObligacionesProyectadas)} equivalen al ${pct(proporcion)} ` +
        `del sueldo de ${periodLabel(balance.periodo)}. Lo recomendable es mantenerlas bajo 50% para tener margen; ` +
        `si puedes, evalua renegociar plazos o tasas.`,
    });
  }

  private evaluarPrioridadCreditos(balance: Balance, creditos: CreditoResumen[], out: Recomendacion[]): void {
    const activos = creditos.filter((c) => c.activa && c.tasaInteres != null);
    if (!activos.length || balance.disponibleParaCreditos <= 0) return;

    const prioritario = [...activos].sort((a, b) => (b.tasaInteres ?? 0) - (a.tasaInteres ?? 0))[0];

    const detalleSaldo =
      prioritario.saldoPendiente != null
        ? ` Su saldo pendiente es ${money(prioritario.saldoPendiente)}; con tu disponible de ` +
          `${money(balance.disponibleParaCreditos)} podrias cubrir ` +
          `${pct(Math.min(1, balance.disponibleParaCreditos / prioritario.saldoPendiente))} de esa deuda.`
        : '';

    out.push({
      id: 'prioridad-credito',
      severidad: 'info',
      titulo: `Prioriza abonar a ${prioritario.descripcion}`,
      detalle:
        `Es el credito con la tasa mas alta de los ${activos.length} que tienes activos ` +
        `(${prioritario.tasaInteres}% E.A.${prioritario.banco ? ' en ' + prioritario.banco : ''}).` +
        `${detalleSaldo} Pagar primero el de mayor tasa (metodo avalancha) es lo que menos intereses te hace pagar en total.`,
    });
  }
}
