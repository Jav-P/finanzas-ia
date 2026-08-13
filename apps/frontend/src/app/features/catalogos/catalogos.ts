import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { Categoria, Lugar, MedioPago, Producto, TipoMedioPago } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-catalogos',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './catalogos.html',
})
export class Catalogos implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly mediosPago = signal<MedioPago[]>([]);
  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly productos = signal<Producto[]>([]);

  protected editandoId = signal<string | null>(null);
  protected nombreEdit = '';
  protected tipoEdit: TipoMedioPago = 'efectivo';

  protected readonly mostrarNuevaCategoria = signal(false);
  protected readonly mostrarNuevoMedioPago = signal(false);
  protected readonly mostrarNuevoLugar = signal(false);
  protected readonly mostrarNuevoProducto = signal(false);

  protected nuevaCategoria = '';
  protected nuevoMedioPagoNombre = '';
  protected nuevoMedioPagoTipo: TipoMedioPago = 'efectivo';
  protected nuevoLugar = '';
  protected nuevoProducto = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.api.categorias().subscribe((c) => this.categorias.set(c));
    this.api.mediosPago().subscribe((m) => this.mediosPago.set(m));
    this.api.lugares().subscribe((l) => this.lugares.set(l));
    this.api.productos().subscribe((p) => this.productos.set(p));
  }

  // --- Categorias ---
  crearCategoria(): void {
    if (!this.nuevaCategoria.trim()) return;
    this.api.crearCategoria({ nombre: this.nuevaCategoria.trim() }).subscribe(() => {
      this.nuevaCategoria = '';
      this.mostrarNuevaCategoria.set(false);
      this.api.categorias().subscribe((c) => this.categorias.set(c));
    });
  }

  editarCategoria(id: string): void {
    this.editandoId.set(id);
    this.nombreEdit = this.categorias().find((c) => c.id === id)?.nombre ?? '';
  }

  guardarCategoria(id: string): void {
    this.api.editarCategoria(id, { nombre: this.nombreEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.categorias().subscribe((c) => this.categorias.set(c));
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
        nombre: this.nuevoMedioPagoNombre.trim(),
        tipo: this.nuevoMedioPagoTipo,
      })
      .subscribe(() => {
        this.nuevoMedioPagoNombre = '';
        this.mostrarNuevoMedioPago.set(false);
        this.api.mediosPago().subscribe((m) => this.mediosPago.set(m));
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
      this.api.mediosPago().subscribe((m) => this.mediosPago.set(m));
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
    this.api.crearLugar({ nombre: this.nuevoLugar.trim() }).subscribe(() => {
      this.nuevoLugar = '';
      this.mostrarNuevoLugar.set(false);
      this.api.lugares().subscribe((l) => this.lugares.set(l));
    });
  }

  editarLugar(id: string): void {
    this.editandoId.set(id);
    this.nombreEdit = this.lugares().find((l) => l.id === id)?.nombre ?? '';
  }

  guardarLugar(id: string): void {
    this.api.editarLugar(id, { nombre: this.nombreEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.lugares().subscribe((l) => this.lugares.set(l));
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
    this.api.crearProducto({ nombre: this.nuevoProducto.trim() }).subscribe(() => {
      this.nuevoProducto = '';
      this.mostrarNuevoProducto.set(false);
      this.api.productos().subscribe((p) => this.productos.set(p));
    });
  }

  editarProducto(id: string): void {
    this.editandoId.set(id);
    this.nombreEdit = this.productos().find((p) => p.id === id)?.nombre ?? '';
  }

  guardarProducto(id: string): void {
    this.api.editarProducto(id, { nombre: this.nombreEdit }).subscribe(() => {
      this.editandoId.set(null);
      this.api.productos().subscribe((p) => this.productos.set(p));
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
