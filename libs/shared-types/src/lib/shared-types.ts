// Tipos compartidos entre frontend (Angular) y backend (NestJS),
// reflejando el esquema de supabase/migrations/*_init_schema.sql.

export type Recurrencia = 'unica' | 'mensual';
export type EstadoInstancia = 'pendiente' | 'pagado' | 'vencido';

export interface Hogar {
  id: string;
  nombre: string;
  createdAt: string;
}

export interface Usuario {
  id: string;
  hogarId: string;
  nombre: string;
  email: string;
  createdAt: string;
}

export interface Categoria {
  id: string;
  hogarId: string | null; // null = categoria global/seed
  nombre: string;
  color: string | null;
  createdAt: string;
}

export interface Obligacion {
  id: string;
  hogarId: string;
  usuarioResponsableId: string | null; // null = compartida
  categoriaId: string;
  descripcion: string;
  monto: number;
  recurrencia: Recurrencia;
  diaVencimiento: number | null; // solo si recurrencia = 'mensual'
  fechaInicio: string;
  activa: boolean;
  createdAt: string;
}

export interface ObligacionInstancia {
  id: string;
  obligacionId: string;
  periodo: string;
  fechaVencimiento: string;
  monto: number;
  estado: EstadoInstancia;
  createdAt: string;
}

export interface Pago {
  id: string;
  instanciaId: string;
  usuarioPagoId: string;
  fechaPago: string;
  montoPagado: number;
  urlComprobante: string;
  createdAt: string;
}

// Instancia enriquecida con los datos que necesita el dashboard/detalle,
// sin depender de resource embedding de PostgREST (no hay FKs en el schema).
export interface InstanciaConDetalle extends ObligacionInstancia {
  obligacion: Obligacion;
  categoria: Categoria;
  pago: Pago | null;
}

export interface CreateCategoriaDto {
  hogarId: string;
  nombre: string;
  color?: string | null;
}

export interface CreateObligacionDto {
  hogarId: string;
  usuarioResponsableId?: string | null;
  categoriaId: string;
  descripcion: string;
  monto: number;
  recurrencia: Recurrencia;
  diaVencimiento?: number | null;
  fechaInicio: string;
}

export type UpdateObligacionDto = Partial<Omit<CreateObligacionDto, 'hogarId'>>;

export interface RegistrarPagoDto {
  usuarioPagoId: string;
  fechaPago: string;
  montoPagado: number;
}

// --- Fase 2: ingresos, gastos variables, presupuestos ---

export interface Ingreso {
  id: string;
  hogarId: string;
  usuarioId: string;
  descripcion: string;
  monto: number;
  periodicidad: Recurrencia;
  diaPago: number | null; // solo si periodicidad = 'mensual'
  fechaInicio: string;
  activo: boolean;
  createdAt: string;
}

export interface CreateIngresoDto {
  hogarId: string;
  usuarioId: string;
  descripcion: string;
  monto: number;
  periodicidad: Recurrencia;
  diaPago?: number | null;
  fechaInicio: string;
}

export interface BalancePersona {
  usuarioId: string;
  nombre: string;
  ingresos: number;
  obligaciones: number;
  gastos: number;
  saldo: number;
}

export interface Balance {
  periodo: string;
  ingresos: number;
  obligaciones: number;
  gastos: number;
  saldo: number;
  porUsuario: BalancePersona[];
}

export type TipoMedioPago = 'efectivo' | 'debito' | 'credito' | 'transferencia';

export interface MedioPago {
  id: string;
  hogarId: string;
  nombre: string;
  tipo: TipoMedioPago;
  createdAt: string;
}

export interface CreateMedioPagoDto {
  hogarId: string;
  nombre: string;
  tipo: TipoMedioPago;
}

export interface Lugar {
  id: string;
  hogarId: string;
  nombre: string;
  createdAt: string;
}

export interface CreateLugarDto {
  hogarId: string;
  nombre: string;
}

export interface Producto {
  id: string;
  hogarId: string;
  categoriaId: string | null;
  nombre: string;
  createdAt: string;
}

export interface CreateProductoDto {
  hogarId: string;
  categoriaId?: string | null;
  nombre: string;
}

export interface GastoItem {
  id: string;
  gastoId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  calificacion: number | null; // 1-5
  createdAt: string;
}

export interface CreateGastoItemDto {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  calificacion?: number | null;
}

export interface Gasto {
  id: string;
  hogarId: string;
  usuarioId: string;
  categoriaId: string;
  lugarId: string | null;
  medioPagoId: string | null;
  descripcion: string;
  montoTotal: number;
  fecha: string;
  urlComprobante: string | null;
  createdAt: string;
}

export interface CreateGastoDto {
  hogarId: string;
  usuarioId: string;
  categoriaId: string;
  lugarId?: string | null;
  medioPagoId?: string | null;
  descripcion: string;
  montoTotal: number;
  fecha: string;
  items?: CreateGastoItemDto[];
}

export interface GastoConItems extends Gasto {
  items: GastoItem[];
}

export interface Presupuesto {
  id: string;
  hogarId: string;
  categoriaId: string;
  periodo: string;
  montoPresupuestado: number;
  createdAt: string;
}

export interface CreatePresupuestoDto {
  hogarId: string;
  categoriaId: string;
  periodo: string;
  montoPresupuestado: number;
}

export interface PresupuestoResumenItem {
  categoriaId: string;
  categoriaNombre: string;
  presupuestado: number;
  gastado: number;
  diferencia: number; // presupuestado - gastado (negativo = te pasaste)
}

export interface HistoricoPrecioItem {
  fecha: string;
  lugarId: string | null;
  lugarNombre: string | null;
  cantidad: number;
  precioUnitario: number;
}
