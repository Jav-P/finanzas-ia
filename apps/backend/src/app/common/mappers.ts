// Supabase/PostgREST devuelve las filas tal cual estan en Postgres
// (snake_case). Estos mappers las traducen a los tipos compartidos
// (camelCase) de @finanzas-ia/shared-types.

import type {
  Categoria,
  Obligacion,
  ObligacionInstancia,
  Pago,
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
    fechaInicio: row.fecha_inicio,
    activa: row.activa,
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
