// Supabase/PostgREST devuelve las filas tal cual estan en Postgres
// (snake_case). Estos mappers las traducen a los tipos compartidos
// (camelCase) de @finanzas-ia/shared-types.

import type {
  Categoria,
  Gasto,
  GastoItem,
  Ingreso,
  Lugar,
  MedioPago,
  Obligacion,
  ObligacionInstancia,
  Pago,
  Presupuesto,
  Producto,
  Usuario,
} from '@finanzas-ia/shared-types';

export function toUsuario(row: any): Usuario {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    nombre: row.nombre,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function toCategoria(row: any): Categoria {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    nombre: row.nombre,
    color: row.color,
    createdAt: row.created_at,
  };
}

export function toObligacion(row: any): Obligacion {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    usuarioResponsableId: row.usuario_responsable_id,
    categoriaId: row.categoria_id,
    descripcion: row.descripcion,
    monto: row.monto,
    recurrencia: row.recurrencia,
    diaVencimiento: row.dia_vencimiento,
    numeroCuotas: row.numero_cuotas,
    fechaInicio: row.fecha_inicio,
    activa: row.activa,
    banco: row.banco,
    tasaInteres: row.tasa_interes,
    saldoPendiente: row.saldo_pendiente,
    saldoActualizadoEn: row.saldo_actualizado_en,
    createdAt: row.created_at,
  };
}

export function toInstancia(row: any): ObligacionInstancia {
  return {
    id: row.id,
    obligacionId: row.obligacion_id,
    periodo: row.periodo,
    fechaVencimiento: row.fecha_vencimiento,
    monto: row.monto,
    estado: row.estado,
    createdAt: row.created_at,
  };
}

export function toPago(row: any): Pago {
  return {
    id: row.id,
    instanciaId: row.instancia_id,
    usuarioPagoId: row.usuario_pago_id,
    fechaPago: row.fecha_pago,
    montoPagado: row.monto_pagado,
    urlComprobante: row.url_comprobante,
    createdAt: row.created_at,
  };
}

export function toIngreso(row: any): Ingreso {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    usuarioId: row.usuario_id,
    descripcion: row.descripcion,
    monto: row.monto,
    periodicidad: row.periodicidad,
    diaPago: row.dia_pago,
    fechaInicio: row.fecha_inicio,
    activo: row.activo,
    createdAt: row.created_at,
  };
}

export function toMedioPago(row: any): MedioPago {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    nombre: row.nombre,
    tipo: row.tipo,
    createdAt: row.created_at,
  };
}

export function toLugar(row: any): Lugar {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    nombre: row.nombre,
    createdAt: row.created_at,
  };
}

export function toProducto(row: any): Producto {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    categoriaId: row.categoria_id,
    nombre: row.nombre,
    createdAt: row.created_at,
  };
}

export function toGasto(row: any): Gasto {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    usuarioId: row.usuario_id,
    categoriaId: row.categoria_id,
    lugarId: row.lugar_id,
    medioPagoId: row.medio_pago_id,
    descripcion: row.descripcion,
    montoTotal: row.monto_total,
    fecha: row.fecha,
    urlComprobante: row.url_comprobante,
    createdAt: row.created_at,
  };
}

export function toGastoItem(row: any): GastoItem {
  return {
    id: row.id,
    gastoId: row.gasto_id,
    productoId: row.producto_id,
    cantidad: row.cantidad,
    precioUnitario: row.precio_unitario,
    calificacion: row.calificacion,
    createdAt: row.created_at,
  };
}

export function toPresupuesto(row: any): Presupuesto {
  return {
    id: row.id,
    hogarId: row.hogar_id,
    categoriaId: row.categoria_id,
    periodo: row.periodo,
    montoPresupuestado: row.monto_presupuestado,
    esFijo: row.es_fijo,
    createdAt: row.created_at,
  };
}
