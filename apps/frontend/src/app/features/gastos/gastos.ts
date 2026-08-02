import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type {
  Categoria,
  CreateGastoItemDto,
  GastoConItems,
  HistoricoPrecioItem,
  Lugar,
  MedioPago,
  Producto,
} from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

interface ItemBorrador {
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  calificacion: number | null;
}

@Component({
  selector: 'app-gastos',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './gastos.html',
})
export class Gastos implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);

  protected readonly gastos = signal<GastoConItems[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly mediosPago = signal<MedioPago[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly guardando = signal(false);
  protected readonly historico = signal<HistoricoPrecioItem[] | null>(null);
  protected readonly historicoProducto = signal<string | null>(null);

  protected descripcion = 'Mercado';
  protected categoriaId = '';
  protected lugarNombre = '';
  protected medioPagoId = '';
  protected fecha = new Date().toISOString().slice(0, 10);
  protected items: ItemBorrador[] = [];

  ngOnInit(): void {
    forkJoin({
      categorias: this.api.categorias(this.session.hogarId),
      lugares: this.api.lugares(this.session.hogarId),
      mediosPago: this.api.mediosPago(this.session.hogarId),
      productos: this.api.productos(this.session.hogarId),
    }).subscribe(({ categorias, lugares, mediosPago, productos }) => {
      this.categorias.set(categorias);
      this.lugares.set(lugares);
      this.mediosPago.set(mediosPago);
      this.productos.set(productos);
      const mercado = categorias.find((c) => c.nombre.toLowerCase() === 'mercado');
      this.categoriaId = mercado?.id ?? categorias[0]?.id ?? '';
    });
    this.cargarGastos();
    this.agregarItem();
  }

  nombreProducto(productoId: string): string {
    return this.productos().find((p) => p.id === productoId)?.nombre ?? '—';
  }

  agregarItem(): void {
    this.items.push({ productoNombre: '', cantidad: 1, precioUnitario: 0, calificacion: null });
  }

  quitarItem(index: number): void {
    this.items.splice(index, 1);
  }

  get montoTotal(): number {
    return this.items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  }

  verHistorico(productoId: string): void {
    this.historicoProducto.set(productoId);
    this.api.historicoPrecios(productoId).subscribe((historico) => this.historico.set(historico));
  }

  async guardar(): Promise<void> {
    const usuarioId = this.session.usuarioActualId();
    if (!usuarioId || !this.categoriaId || !this.fecha || !this.items.length) return;

    this.guardando.set(true);

    const itemsDto = await this.resolverItems();
    const lugarId = this.lugarNombre.trim() ? await this.resolverLugar(this.lugarNombre.trim()) : null;

    this.api
      .crearGasto({
        hogarId: this.session.hogarId,
        usuarioId,
        categoriaId: this.categoriaId,
        lugarId,
        medioPagoId: this.medioPagoId || null,
        descripcion: this.descripcion,
        montoTotal: this.montoTotal,
        fecha: this.fecha,
        items: itemsDto,
      })
      .subscribe(() => {
        this.guardando.set(false);
        this.lugarNombre = '';
        this.items = [];
        this.agregarItem();
        this.cargarGastos();
      });
  }

  private async resolverItems(): Promise<CreateGastoItemDto[]> {
    const dtos: CreateGastoItemDto[] = [];
    for (const item of this.items) {
      const nombre = item.productoNombre.trim();
      if (!nombre) continue;

      const productoId = await this.resolverProducto(nombre);
      dtos.push({
        productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        calificacion: item.calificacion,
      });
    }
    return dtos;
  }

  private async resolverProducto(nombre: string): Promise<string> {
    const existente = this.productos().find((p) => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) return existente.id;

    const creado = await firstValueFrom(
      this.api.crearProducto({ hogarId: this.session.hogarId, nombre }),
    );
    this.productos.update((lista) => [...lista, creado]);
    return creado.id;
  }

  private async resolverLugar(nombre: string): Promise<string> {
    const existente = this.lugares().find((l) => l.nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) return existente.id;

    const creado = await firstValueFrom(this.api.crearLugar({ hogarId: this.session.hogarId, nombre }));
    this.lugares.update((lista) => [...lista, creado]);
    return creado.id;
  }

  private cargarGastos(): void {
    this.api.gastos(this.session.hogarId).subscribe((gastos) => this.gastos.set(gastos));
  }
}
