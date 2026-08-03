import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Categoria, Lugar, MedioPago, Producto, TipoMedioPago } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-catalogos',
  imports: [FormsModule],
  templateUrl: './catalogos.html',
})
export class Catalogos implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly mediosPago = signal<MedioPago[]>([]);
  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly productos = signal<Producto[]>([]);

  protected editandoId = signal<string | null>(null);
  protected nombreEdit = '';
  protected tipoEdit: TipoMedioPago = 'efectivo';

  protected nuevaCategoria = '';
  protected nuevoMedioPagoNombre = '';
  protected nuevoMedioPagoTipo: TipoMedioPago = 'efectivo';
  protected nuevoLugar = '';
  protected nuevoProducto = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.api.categorias(this.session.hogarId).subscribe((c) => this.categorias.set(c));
    this.api.mediosPago(this.session.hogarId).subscribe((m) => this.mediosPago.set(m));
    this.api.lugares(this.session.hogarId).subscribe((l) => this.lugares.set(l));
    this.api.productos(this.session.hogarId).subscribe((p) => this.productos.set(p));
  }

  // --- Categorias ---
  crearCategoria(): void {
    if (!this.nuevaCategoria.trim()) return;
    this.api
      .crearCategoria({ hogarId: this.session.hogarId, nombre: this.nuevaCategoria.trim() })
      .subscribe(() => {
        this.nuevaCategoria = '';
        this.api.categorias(this.session.hogarId).subscribe((c) => this.categorias.set(c));
      });
  }

  editarCategoria(id: string): void {
    this.editandoId.set(id);
    this.nombreEdit = this.categorias().find((c) => c.id === id)?.nombre ?? '';
  }

  guardarCategoria(id: string): void {
    this.api.editarCategoria(id, { nombre: this.nombreEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.categorias(this.session.hogarId).subscribe((c) => this.categorias.set(c));
    });
  }

  eliminarCategoria(id: string): void {
    this.api.eliminarCategoria(id).subscribe(() =>
      this.categorias.update((lista) => lista.filter((c) => c.id !== id)),
    );
  }

  // --- Medios de pago ---
  crearMedioPago(): void {
    if (!this.nuevoMedioPagoNombre.trim()) return;
    this.api
      .crearMedioPago({
        hogarId: this.session.hogarId,
        nombre: this.nuevoMedioPagoNombre.trim(),
        tipo: this.nuevoMedioPagoTipo,
      })
      .subscribe(() => {
        this.nuevoMedioPagoNombre = '';
        this.api.mediosPago(this.session.hogarId).subscribe((m) => this.mediosPago.set(m));
      });
  }

  editarMedioPago(id: string): void {
    this.editandoId.set(id);
    const medio = this.mediosPago().find((m) => m.id === id);
    this.nombreEdit = medio?.nombre ?? '';
    this.tipoEdit = medio?.tipo ?? 'efectivo';
  }

  guardarMedioPago(id: string): void {
    this.api.editarMedioPago(id, { nombre: this.nombreEdit, tipo: this.tipoEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.mediosPago(this.session.hogarId).subscribe((m) => this.mediosPago.set(m));
    });
  }

  eliminarMedioPago(id: string): void {
    this.api.eliminarMedioPago(id).subscribe(() =>
      this.mediosPago.update((lista) => lista.filter((m) => m.id !== id)),
    );
  }

  // --- Lugares ---
  crearLugar(): void {
    if (!this.nuevoLugar.trim()) return;
    this.api.crearLugar({ hogarId: this.session.hogarId, nombre: this.nuevoLugar.trim() }).subscribe(() => {
      this.nuevoLugar = '';
      this.api.lugares(this.session.hogarId).subscribe((l) => this.lugares.set(l));
    });
  }

  editarLugar(id: string): void {
    this.editandoId.set(id);
    this.nombreEdit = this.lugares().find((l) => l.id === id)?.nombre ?? '';
  }

  guardarLugar(id: string): void {
    this.api.editarLugar(id, { nombre: this.nombreEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.lugares(this.session.hogarId).subscribe((l) => this.lugares.set(l));
    });
  }

  eliminarLugar(id: string): void {
    this.api.eliminarLugar(id).subscribe(() =>
      this.lugares.update((lista) => lista.filter((l) => l.id !== id)),
    );
  }

  // --- Productos ---
  crearProducto(): void {
    if (!this.nuevoProducto.trim()) return;
    this.api
      .crearProducto({ hogarId: this.session.hogarId, nombre: this.nuevoProducto.trim() })
      .subscribe(() => {
        this.nuevoProducto = '';
        this.api.productos(this.session.hogarId).subscribe((p) => this.productos.set(p));
      });
  }

  editarProducto(id: string): void {
    this.editandoId.set(id);
    this.nombreEdit = this.productos().find((p) => p.id === id)?.nombre ?? '';
  }

  guardarProducto(id: string): void {
    this.api.editarProducto(id, { nombre: this.nombreEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.productos(this.session.hogarId).subscribe((p) => this.productos.set(p));
    });
  }

  eliminarProducto(id: string): void {
    this.api.eliminarProducto(id).subscribe(() =>
      this.productos.update((lista) => lista.filter((p) => p.id !== id)),
    );
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }
}
