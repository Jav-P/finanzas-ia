import { Injectable } from '@nestjs/common';
import type { CategoriaCosto, SaludFinanciera } from '@finanzas-ia/shared-types';
import { BalanceService } from '../balance/balance.service';
import { PresupuestosService } from '../presupuestos/presupuestos.service';
import { CategoriasService } from '../categorias/categorias.service';
import { CuentasService } from '../cuentas/cuentas.service';
import { ObligacionesService } from '../obligaciones/obligaciones.service';
import { addMeses } from '../common/period';

@Injectable()
export class AnalisisService {
  constructor(
    private readonly balance: BalanceService,
    private readonly presupuestos: PresupuestosService,
    private readonly categorias: CategoriasService,
    private readonly cuentas: CuentasService,
    private readonly obligaciones: ObligacionesService,
  ) {}

  // Ranking de categorias por costo total del mes, combinando lo fijo
  // (obligaciones proyectadas al mes siguiente) y lo variable
  // (presupuestos/gasto real de este mes) -- la misma logica que usa
  // el plan del mes, pero por categoria en vez de un solo total.
  async categorias_(hogarId: string, periodo: string): Promise<CategoriaCosto[]> {
    const periodoSiguiente = addMeses(periodo, 1);

    const [obligacionesPorCategoria, resumenPresupuestos, categoriasList] = await Promise.all([
      this.balance.obligacionesPorCategoria(hogarId, periodoSiguiente),
      this.presupuestos.resumen(hogarId, periodo),
      this.categorias.findByHogar(hogarId),
    ]);

    const nombrePorCategoria = new Map(categoriasList.map((c) => [c.id, c.nombre]));
    const totales = new Map<string, { obligaciones: number; presupuesto: number }>();

    for (const [categoriaId, monto] of obligacionesPorCategoria) {
      const actual = totales.get(categoriaId) ?? { obligaciones: 0, presupuesto: 0 };
      actual.obligaciones += monto;
      totales.set(categoriaId, actual);
    }

    for (const item of resumenPresupuestos) {
      const efectivo = item.gastado > 0 ? item.gastado : item.presupuestado;
      if (efectivo <= 0) continue;
      const actual = totales.get(item.categoriaId) ?? { obligaciones: 0, presupuesto: 0 };
      actual.presupuesto += efectivo;
      totales.set(item.categoriaId, actual);
    }

    return Array.from(totales.entries())
      .map(([categoriaId, { obligaciones, presupuesto }]) => ({
        categoriaId,
        categoriaNombre: nombrePorCategoria.get(categoriaId) ?? 'Sin categoría',
        obligaciones,
        presupuesto,
        total: obligaciones + presupuesto,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Cuatro numeros para responder "¿puedo con un imprevisto?" y
  // "¿que tan cara/pesada es mi deuda?", a partir de datos que ya se
  // calculan en otros lados (Balance, Patrimonio, Creditos).
  async saludFinanciera(hogarId: string, periodo: string): Promise<SaludFinanciera> {
    const [balanceDelMes, patrimonio, creditos] = await Promise.all([
      this.balance.calcular(hogarId, periodo),
      this.cuentas.patrimonio(hogarId),
      this.obligaciones.listCreditos(hogarId),
    ]);

    const gastoMensualFijo = balanceDelMes.obligacionesProyectadas + balanceDelMes.presupuestado;
    const colchonMeses = gastoMensualFijo > 0 ? patrimonio.disponible / gastoMensualFijo : null;

    const creditosActivos = creditos.filter((c) => c.activa);
    const cuotasMensuales = creditosActivos.reduce((sum, c) => sum + c.montoCuota, 0);
    const nivelEndeudamiento = balanceDelMes.ingresos > 0 ? cuotasMensuales / balanceDelMes.ingresos : null;

    const conTasa = creditosActivos.filter((c) => c.tasaInteres != null);
    const pesoTotal = conTasa.reduce((sum, c) => sum + (c.saldoPendiente ?? c.montoCuota), 0);
    const costoDeudaPromedio =
      pesoTotal > 0
        ? conTasa.reduce((sum, c) => sum + c.tasaInteres! * (c.saldoPendiente ?? c.montoCuota), 0) / pesoTotal
        : null;

    return {
      colchonMeses,
      capacidadInversionMensual: balanceDelMes.disponibleParaCreditos,
      nivelEndeudamiento,
      costoDeudaPromedio,
    };
  }
}
