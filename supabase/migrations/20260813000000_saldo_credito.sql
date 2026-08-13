-- Saldo pendiente de un credito: se actualiza a mano cada mes (no se
-- calcula, porque intereses/seguros/IVA que cobra el banco no siempre
-- coinciden con una formula de amortizacion teorica).

alter table obligaciones
  add column saldo_pendiente numeric(12, 2) check (saldo_pendiente >= 0),
  add column saldo_actualizado_en date;
