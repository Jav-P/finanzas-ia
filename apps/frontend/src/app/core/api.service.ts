import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  ActualizarSaldoCreditoDto,
  Balance,
  Categoria,
  CompletarRegistroDto,
  CompletarRegistroResultado,
  CreateCategoriaDto,
  CreateGastoDto,
  CreateIngresoDto,
  CreateInvitacionDto,
  CreateLugarDto,
  CreateMedioPagoDto,
  CreateObligacionDto,
  CreatePresupuestoDto,
  CreateProductoDto,
  CreditoResumen,
  GastoConItems,
  GenerarInstanciasResultado,
  HistoricoPrecioItem,
  Ingreso,
  InstanciaConDetalle,
  InvitacionCreada,
  InvitacionPublica,
  Lugar,
  MedioPago,
  Obligacion,
  Presupuesto,
  PresupuestoResumenItem,
  Producto,
  RegistrarPagoDto,
  UpdateCategoriaDto,
  UpdateGastoDto,
  UpdateIngresoDto,
  UpdateLugarDto,
  UpdateMedioPagoDto,
  UpdateObligacionDto,
  UpdateProductoDto,
  Usuario,
} from '@finanzas-ia/shared-types';
import { API_URL } from './config';

// hogarId ya no se manda desde aca: el backend lo saca del token de
// Supabase Auth (ver AuthGuard). Todo esto asume que el interceptor de
// auth ya agrego el header Authorization.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Auth / invitaciones
  usuarioYo() {
    return this.http.get<Usuario | null>(`${API_URL}/usuarios/yo`);
  }

  completarRegistro(dto: CompletarRegistroDto) {
    return this.http.post<CompletarRegistroResultado>(`${API_URL}/auth/completar-registro`, dto);
  }

  crearInvitacion(dto: CreateInvitacionDto) {
    return this.http.post<InvitacionCreada>(`${API_URL}/invitaciones`, dto);
  }

  obtenerInvitacionPublica(token: string) {
    return this.http.get<InvitacionPublica>(`${API_URL}/invitaciones/${token}`);
  }

  aceptarInvitacion(token: string) {
    return this.http.post<void>(`${API_URL}/invitaciones/${token}/aceptar`, {});
  }

  rechazarInvitacion(token: string) {
    return this.http.post<void>(`${API_URL}/invitaciones/${token}/rechazar`, {});
  }

  // Usuarios (del hogar actual)
  usuarios() {
    return this.http.get<Usuario[]>(`${API_URL}/usuarios`);
  }

  // Categorias
  categorias() {
    return this.http.get<Categoria[]>(`${API_URL}/categorias`);
  }

  crearCategoria(dto: CreateCategoriaDto) {
    return this.http.post<Categoria>(`${API_URL}/categorias`, dto);
  }

  editarCategoria(id: string, dto: UpdateCategoriaDto) {
    return this.http.patch<Categoria>(`${API_URL}/categorias/${id}`, dto);
  }

  eliminarCategoria(id: string) {
    return this.http.delete<void>(`${API_URL}/categorias/${id}`);
  }

  // Obligaciones
  crearObligacion(dto: CreateObligacionDto) {
    return this.http.post<Obligacion>(`${API_URL}/obligaciones`, dto);
  }

  obligacion(id: string) {
    return this.http.get<Obligacion>(`${API_URL}/obligaciones/${id}`);
  }

  editarObligacion(id: string, dto: UpdateObligacionDto) {
    return this.http.patch<Obligacion>(`${API_URL}/obligaciones/${id}`, dto);
  }

  desactivarObligacion(id: string) {
    return this.http.patch<Obligacion>(`${API_URL}/obligaciones/${id}/desactivar`, {});
  }

  eliminarObligacion(id: string) {
    return this.http.delete<void>(`${API_URL}/obligaciones/${id}`);
  }

  generarInstanciasPendientes() {
    return this.http.post<GenerarInstanciasResultado>(`${API_URL}/obligaciones/generar-instancias`, {});
  }

  creditos() {
    return this.http.get<CreditoResumen[]>(`${API_URL}/obligaciones/creditos`);
  }

  actualizarSaldoCredito(obligacionId: string, dto: ActualizarSaldoCreditoDto) {
    return this.http.patch<Obligacion>(`${API_URL}/obligaciones/${obligacionId}/saldo`, dto);
  }

  // Instancias
  instancias(usuarioId?: string, estado?: string) {
    let params = new HttpParams();
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

  revertirPago(instanciaId: string) {
    return this.http.delete<void>(`${API_URL}/instancias/${instanciaId}/pago`);
  }

  // Ingresos + balance
  ingresos() {
    return this.http.get<Ingreso[]>(`${API_URL}/ingresos`);
  }

  crearIngreso(dto: CreateIngresoDto) {
    return this.http.post<Ingreso>(`${API_URL}/ingresos`, dto);
  }

  editarIngreso(id: string, dto: UpdateIngresoDto) {
    return this.http.patch<Ingreso>(`${API_URL}/ingresos/${id}`, dto);
  }

  eliminarIngreso(id: string) {
    return this.http.delete<void>(`${API_URL}/ingresos/${id}`);
  }

  balance(periodo: string) {
    return this.http.get<Balance>(`${API_URL}/balance`, { params: { periodo } });
  }

  // Presupuestos
  presupuestosResumen(periodo: string) {
    return this.http.get<PresupuestoResumenItem[]>(`${API_URL}/presupuestos/resumen`, {
      params: { periodo },
    });
  }

  presupuestos(periodo: string) {
    return this.http.get<Presupuesto[]>(`${API_URL}/presupuestos`, { params: { periodo } });
  }

  guardarPresupuesto(dto: CreatePresupuestoDto) {
    return this.http.post<Presupuesto>(`${API_URL}/presupuestos`, dto);
  }

  eliminarPresupuesto(id: string) {
    return this.http.delete<void>(`${API_URL}/presupuestos/${id}`);
  }

  // Catalogos
  mediosPago() {
    return this.http.get<MedioPago[]>(`${API_URL}/medios-pago`);
  }

  crearMedioPago(dto: CreateMedioPagoDto) {
    return this.http.post<MedioPago>(`${API_URL}/medios-pago`, dto);
  }

  editarMedioPago(id: string, dto: UpdateMedioPagoDto) {
    return this.http.patch<MedioPago>(`${API_URL}/medios-pago/${id}`, dto);
  }

  eliminarMedioPago(id: string) {
    return this.http.delete<void>(`${API_URL}/medios-pago/${id}`);
  }

  lugares() {
    return this.http.get<Lugar[]>(`${API_URL}/lugares`);
  }

  crearLugar(dto: CreateLugarDto) {
    return this.http.post<Lugar>(`${API_URL}/lugares`, dto);
  }

  editarLugar(id: string, dto: UpdateLugarDto) {
    return this.http.patch<Lugar>(`${API_URL}/lugares/${id}`, dto);
  }

  eliminarLugar(id: string) {
    return this.http.delete<void>(`${API_URL}/lugares/${id}`);
  }

  productos() {
    return this.http.get<Producto[]>(`${API_URL}/productos`);
  }

  crearProducto(dto: CreateProductoDto) {
    return this.http.post<Producto>(`${API_URL}/productos`, dto);
  }

  editarProducto(id: string, dto: UpdateProductoDto) {
    return this.http.patch<Producto>(`${API_URL}/productos/${id}`, dto);
  }

  eliminarProducto(id: string) {
    return this.http.delete<void>(`${API_URL}/productos/${id}`);
  }

  historicoPrecios(productoId: string) {
    return this.http.get<HistoricoPrecioItem[]>(`${API_URL}/productos/${productoId}/historico-precios`);
  }

  // Gastos
  gastos(desde?: string, hasta?: string) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<GastoConItems[]>(`${API_URL}/gastos`, { params });
  }

  crearGasto(dto: CreateGastoDto) {
    return this.http.post<GastoConItems>(`${API_URL}/gastos`, dto);
  }

  editarGasto(id: string, dto: UpdateGastoDto) {
    return this.http.patch<GastoConItems>(`${API_URL}/gastos/${id}`, dto);
  }

  eliminarGasto(id: string) {
    return this.http.delete<void>(`${API_URL}/gastos/${id}`);
  }
}
