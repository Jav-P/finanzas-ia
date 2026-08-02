import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Balance,
  Categoria,
  CreateCategoriaDto,
  CreateGastoDto,
  CreateIngresoDto,
  CreateLugarDto,
  CreateMedioPagoDto,
  CreateObligacionDto,
  CreatePresupuestoDto,
  CreateProductoDto,
  GastoConItems,
  HistoricoPrecioItem,
  Ingreso,
  InstanciaConDetalle,
  Lugar,
  MedioPago,
  Obligacion,
  Presupuesto,
  PresupuestoResumenItem,
  Producto,
  RegistrarPagoDto,
  Usuario,
} from '@finanzas-ia/shared-types';
import { API_URL } from './config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Usuarios
  usuarios(hogarId: string) {
    return this.http.get<Usuario[]>(`${API_URL}/usuarios`, { params: { hogarId } });
  }

  // Categorias
  categorias(hogarId: string) {
    return this.http.get<Categoria[]>(`${API_URL}/categorias`, { params: { hogarId } });
  }

  crearCategoria(dto: CreateCategoriaDto) {
    return this.http.post<Categoria>(`${API_URL}/categorias`, dto);
  }

  // Obligaciones
  crearObligacion(dto: CreateObligacionDto) {
    return this.http.post<Obligacion>(`${API_URL}/obligaciones`, dto);
  }

  desactivarObligacion(id: string) {
    return this.http.patch<Obligacion>(`${API_URL}/obligaciones/${id}/desactivar`, {});
  }

  // Instancias
  instancias(hogarId: string, usuarioId?: string, estado?: string) {
    let params = new HttpParams().set('hogarId', hogarId);
    if (usuarioId) params = params.set('usuarioId', usuarioId);
    if (estado) params = params.set('estado', estado);
    return this.http.get<InstanciaConDetalle[]>(`${API_URL}/instancias`, { params });
  }

  instancia(id: string) {
    return this.http.get<InstanciaConDetalle>(`${API_URL}/instancias/${id}`);
  }

  registrarPago(instanciaId: string, dto: RegistrarPagoDto, comprobante: File) {
    const form = new FormData();
    form.set('usuarioPagoId', dto.usuarioPagoId);
    form.set('fechaPago', dto.fechaPago);
    form.set('montoPagado', String(dto.montoPagado));
    form.set('comprobante', comprobante);
    return this.http.post(`${API_URL}/instancias/${instanciaId}/pago`, form);
  }

  // Ingresos + balance
  ingresos(hogarId: string) {
    return this.http.get<Ingreso[]>(`${API_URL}/ingresos`, { params: { hogarId } });
  }

  crearIngreso(dto: CreateIngresoDto) {
    return this.http.post<Ingreso>(`${API_URL}/ingresos`, dto);
  }

  balance(hogarId: string, periodo: string) {
    return this.http.get<Balance>(`${API_URL}/balance`, { params: { hogarId, periodo } });
  }

  // Presupuestos
  presupuestosResumen(hogarId: string, periodo: string) {
    return this.http.get<PresupuestoResumenItem[]>(`${API_URL}/presupuestos/resumen`, {
      params: { hogarId, periodo },
    });
  }

  guardarPresupuesto(dto: CreatePresupuestoDto) {
    return this.http.post<Presupuesto>(`${API_URL}/presupuestos`, dto);
  }

  // Catalogos
  mediosPago(hogarId: string) {
    return this.http.get<MedioPago[]>(`${API_URL}/medios-pago`, { params: { hogarId } });
  }

  crearMedioPago(dto: CreateMedioPagoDto) {
    return this.http.post<MedioPago>(`${API_URL}/medios-pago`, dto);
  }

  lugares(hogarId: string) {
    return this.http.get<Lugar[]>(`${API_URL}/lugares`, { params: { hogarId } });
  }

  crearLugar(dto: CreateLugarDto) {
    return this.http.post<Lugar>(`${API_URL}/lugares`, dto);
  }

  productos(hogarId: string) {
    return this.http.get<Producto[]>(`${API_URL}/productos`, { params: { hogarId } });
  }

  crearProducto(dto: CreateProductoDto) {
    return this.http.post<Producto>(`${API_URL}/productos`, dto);
  }

  historicoPrecios(productoId: string) {
    return this.http.get<HistoricoPrecioItem[]>(`${API_URL}/productos/${productoId}/historico-precios`);
  }

  // Gastos
  gastos(hogarId: string, desde?: string, hasta?: string) {
    let params = new HttpParams().set('hogarId', hogarId);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<GastoConItems[]>(`${API_URL}/gastos`, { params });
  }

  crearGasto(dto: CreateGastoDto) {
    return this.http.post<GastoConItems>(`${API_URL}/gastos`, dto);
  }
}
