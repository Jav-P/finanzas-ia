// Tipos compartidos entre frontend (Angular) y backend (NestJS),
// reflejando el esquema de supabase/migrations/*_init_schema.sql.

export type Recurrencia = 'unica' | 'mensual';
// 'diaria' es solo para probar el generador de instancias en dias en
// vez de esperar un mes calendario; no tiene sentido para ingresos.
export type RecurrenciaObligacion = Recurrencia | 'diaria';
export type EstadoInstancia = 'pendiente' | 'pagado' | 'vencido';

export interface Hogar {
  id: string;
  nombre: string;
  createdAt: string;
}

export interface Usuario {
  id: string;
  hogarId: string | null; // null = registrado pero sin hogar (pendiente de crear uno o aceptar invitacion)
  nombre: string;
  email: string;
  createdAt: string;
}

// --- Auth / invitaciones ---

// El front nunca habla con Supabase Auth directo: todo signUp/signIn/
// refresh pasa por estos endpoints del backend.
export interface CredencialesDto {
  email: string;
  password: string;
}

export interface RefrescarSesionDto {
  refreshToken: string;
}

export interface SesionAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds (UTC)
}

export interface CompletarRegistroDto {
  nombre: string;
  nombreHogar?: string; // requerido si no viene invitacionToken
  invitacionToken?: string; // si viene, el usuario queda sin hogar hasta aceptar
}

export interface CompletarRegistroResultado {
  usuario: Usuario;
  hogar: Hogar | null; // null si vino de invitacion (pendiente de aceptar)
}

export type EstadoInvitacion = 'pendiente' | 'aceptada' | 'rechazada';

export interface Invitacion {
  id: string;
  hogarId: string;
  token: string;
  email: string | null; // null = link generico para compartir a mano
  estado: EstadoInvitacion;
  invitadoPor: string;
  createdAt: string;
}

export interface CreateInvitacionDto {
  email?: string; // si viene, se manda un correo; si no, solo se genera el link
}

export interface InvitacionCreada extends Invitacion {
  link: string;
  emailEnviado: boolean;
}

// Lo que ve quien todavia no se registro, antes de crear su cuenta.
export interface InvitacionPublica {
  hogarNombre: string;
  email: string | null;
  estado: EstadoInvitacion;
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
  recurrencia: RecurrenciaObligacion;
  diaVencimiento: number | null; // solo si recurrencia = 'mensual'
  numeroCuotas: number | null; // solo si recurrencia != 'unica'; null = indefinida
  fechaInicio: string;
  activa: boolean;
  banco: string | null; // solo si es un credito
  tasaInteres: number | null; // tasa efectiva anual (%), solo si es un credito
  saldoPendiente: number | null; // se actualiza a mano, no se calcula
  saldoActualizadoEn: string | null;
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
  nombre: string;
  color?: string | null;
}

export type UpdateCategoriaDto = Partial<CreateCategoriaDto>;

export interface CreateObligacionDto {
  usuarioResponsableId?: string | null;
  categoriaId: string;
  descripcion: string;
  monto: number;
  recurrencia: RecurrenciaObligacion;
  diaVencimiento?: number | null;
  numeroCuotas?: number | null;
  fechaInicio: string;
  banco?: string | null;
  tasaInteres?: number | null;
  saldoPendiente?: number | null;
}

export type UpdateObligacionDto = Partial<CreateObligacionDto>;

export interface ActualizarSaldoCreditoDto {
  saldoPendiente: number;
}

export interface GenerarInstanciasResultado {
  obligacionesRevisadas: number;
  instanciasCreadas: number;
}

// Una obligacion se considera "credito" cuando tiene banco asignado.
export interface CreditoResumen {
  obligacionId: string;
  descripcion: string;
  categoriaNombre: string;
  banco: string | null;
  tasaInteres: number | null;
  montoCuota: number;
  numeroCuotas: number | null;
  cuotasPagadas: number;
  cuotasRestantes: number | null; // null = indefinida (sin numeroCuotas)
  proximaFechaVencimiento: string | null;
  activa: boolean;
  saldoPendiente: number | null;
  saldoActualizadoEn: string | null;
}

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
  usuarioId: string;
  descripcion: string;
  monto: number;
  periodicidad: Recurrencia;
  diaPago?: number | null;
  fechaInicio: string;
}

export type UpdateIngresoDto = Partial<CreateIngresoDto>;

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
  // El sueldo de "periodo" se cobra a fin de mes y cubre las
  // obligaciones y presupuestos del mes SIGUIENTE (los vencimientos caen
  // apenas despues del pago). Por eso presupuestado/obligacionesProyectadas
  // no son de "periodo" sino de periodoObligacionesProyectadas.
  periodoObligacionesProyectadas: string;
  // Cuanto de los presupuestos de periodoObligacionesProyectadas ya se
  // "usa": el gasto real donde ya se registro, o el monto presupuestado
  // como simulacion mientras no se registre un gasto real en esa
  // categoria.
  presupuestado: number;
  // Total de obligaciones fijas activas que aplican a
  // periodoObligacionesProyectadas, simulado al 100% (monto completo de
  // la plantilla), sin depender de que ya exista una instancia generada
  // para ese mes.
  obligacionesProyectadas: number;
  // ingresos (de "periodo") - obligacionesProyectadas - presupuestado
  // (de periodoObligacionesProyectadas): lo que queda del sueldo de este
  // periodo despues de cubrir, al 100%, las obligaciones y presupuestos
  // del mes siguiente, y por lo tanto lo que se podria destinar a abonar
  // creditos/tarjetas.
  disponibleParaCreditos: number;
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
  nombre: string;
  tipo: TipoMedioPago;
}

export type UpdateMedioPagoDto = Partial<CreateMedioPagoDto>;

export interface Lugar {
  id: string;
  hogarId: string;
  nombre: string;
  createdAt: string;
}

export interface CreateLugarDto {
  nombre: string;
}

export type UpdateLugarDto = Partial<CreateLugarDto>;

export interface Producto {
  id: string;
  hogarId: string;
  categoriaId: string | null;
  nombre: string;
  createdAt: string;
}

export interface CreateProductoDto {
  categoriaId?: string | null;
  nombre: string;
}

export type UpdateProductoDto = Partial<CreateProductoDto>;

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

// Si se incluye "items", reemplaza por completo los items existentes
// del gasto; si se omite, los items actuales quedan sin tocar.
export type UpdateGastoDto = Partial<CreateGastoDto>;

export interface Presupuesto {
  id: string;
  hogarId: string;
  categoriaId: string;
  periodo: string;
  montoPresupuestado: number;
  esFijo: boolean; // true = se repite todos los meses desde `periodo` en adelante
  createdAt: string;
}

export interface CreatePresupuestoDto {
  categoriaId: string;
  periodo: string;
  montoPresupuestado: number;
  esFijo?: boolean;
}

export interface PresupuestoResumenItem {
  categoriaId: string;
  categoriaNombre: string;
  presupuestado: number;
  gastado: number;
  diferencia: number; // presupuestado - gastado (negativo = te pasaste)
  esFijo: boolean;
  // id del presupuesto que efectivamente aplica a este mes (exacto o
  // heredado de uno fijo); null si la categoria no tiene presupuesto.
  presupuestoId: string | null;
}

export interface HistoricoPrecioItem {
  fecha: string;
  lugarId: string | null;
  lugarNombre: string | null;
  cantidad: number;
  precioUnitario: number;
}

// --- Recomendaciones (motor de reglas sobre el balance/plan del mes) ---

export type SeveridadRecomendacion = 'critico' | 'alerta' | 'info';

export interface Recomendacion {
  id: string;
  severidad: SeveridadRecomendacion;
  titulo: string;
  detalle: string;
}

// --- OCR (Claude API) ---
// Resultados "borrador": no se guardan solos, el usuario los revisa y
// confirma antes de persistirlos via los endpoints normales (POST
// /gastos, etc).

export interface FacturaOcrItem {
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface FacturaOcrResultado {
  lugarNombre: string | null;
  fecha: string | null; // YYYY-MM-DD
  montoTotal: number | null;
  items: FacturaOcrItem[];
}

export interface ExtractoTransaccion {
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  monto: number;
}

export interface ExtractoOcrResultado {
  transacciones: ExtractoTransaccion[];
}
