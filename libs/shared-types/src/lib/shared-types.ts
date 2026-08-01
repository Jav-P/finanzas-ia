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
