import type { Cuenta } from '@finanzas-ia/shared-types';

// Cuentas donde tiene sentido que caiga un ingreso (salario, etc.):
// nunca una tarjeta (es deuda), ni una inversion o un bien fisico (su
// saldo es un valor manual, no efectivo que se reciba).
export function esCuentaDeDeposito(cuenta: Cuenta): boolean {
  return cuenta.tipo === 'efectivo' || cuenta.tipo === 'ahorros' || cuenta.tipo === 'bolsillo';
}

// Cuentas con las que tiene sentido pagar algo (un gasto, una cuota):
// ademas de las liquidas, una tarjeta de credito es un medio de pago
// valido. Inversion y bien fisico no lo son.
export function esCuentaDePago(cuenta: Cuenta): boolean {
  return esCuentaDeDeposito(cuenta) || cuenta.tipo === 'tarjeta_credito';
}
