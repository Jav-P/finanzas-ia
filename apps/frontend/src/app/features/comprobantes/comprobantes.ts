import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import type { GastoConItems, InstanciaConDetalle } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { FORMATO_MES_ANIO, periodoActual, periodoDe, periodoMasMeses } from '../../core/mes-anio-formats';

interface FilaComprobante {
  tipo: 'Gasto' | 'Pago de obligación';
  descripcion: string;
  monto: number;
  fecha: string;
  urlComprobante: string;
}

function periodStart(periodo: string): string {
  return `${periodo}-01`;
}

function periodEnd(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return `${periodo}-${String(ultimoDia).padStart(2, '0')}`;
}

@Component({
  selector: 'app-comprobantes',
  imports: [DecimalPipe, MatCardModule, MatFormFieldModule, MatButtonModule, MatIconModule, MatDatepickerModule],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATO_MES_ANIO }],
  templateUrl: './comprobantes.html',
  styleUrl: './comprobantes.scss',
})
export class Comprobantes implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly periodo = signal(periodoActual());
  protected readonly gastos = signal<GastoConItems[]>([]);
  protected readonly instancias = signal<InstanciaConDetalle[]>([]);
  protected readonly cargando = signal(false);

  // Gastos y pagos de obligaciones, combinados y ordenados por fecha
  // (mas reciente primero). Solo filas con comprobante: sin eso no hay
  // nada que "ver" aqui.
  protected readonly filas = computed<FilaComprobante[]>(() => {
    const desde = periodStart(this.periodo());
    const hasta = periodEnd(this.periodo());

    const deGastos: FilaComprobante[] = this.gastos()
      .filter((g) => g.urlComprobante)
      .map((g) => ({ tipo: 'Gasto', descripcion: g.descripcion, monto: g.montoTotal, fecha: g.fecha, urlComprobante: g.urlComprobante! }));

    const dePagos: FilaComprobante[] = this.instancias().flatMap((i) =>
      i.pagos
        .filter((p) => p.fechaPago >= desde && p.fechaPago <= hasta)
        .map((p) => ({
          tipo: 'Pago de obligación' as const,
          descripcion: i.obligacion.descripcion,
          monto: p.montoPagado,
          fecha: p.fechaPago,
          urlComprobante: p.urlComprobante,
        })),
    );

    return [...deGastos, ...dePagos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  });

  ngOnInit(): void {
    this.cargar();
  }

  periodoFecha(): Date {
    const [anio, mes] = this.periodo().split('-').map(Number);
    return new Date(anio, mes - 1, 1);
  }

  seleccionarMes(fecha: Date, datepicker: MatDatepicker<Date>): void {
    this.periodo.set(periodoDe(fecha));
    this.cargar();
    datepicker.close();
  }

  mesAnterior(): void {
    this.periodo.set(periodoMasMeses(this.periodo(), -1));
    this.cargar();
  }

  mesSiguiente(): void {
    this.periodo.set(periodoMasMeses(this.periodo(), 1));
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    const desde = periodStart(this.periodo());
    const hasta = periodEnd(this.periodo());

    forkJoin({
      gastos: this.api.gastos(desde, hasta),
      // Los pagos de obligaciones no se pueden filtrar por fecha del lado
      // del servidor (no hay un endpoint para eso); se traen todas las
      // instancias y se filtra por fecha de pago en el computed `filas`.
      instancias: this.api.instancias(),
    }).subscribe(({ gastos, instancias }) => {
      this.gastos.set(gastos);
      this.instancias.set(instancias);
      this.cargando.set(false);
    });
  }
}
