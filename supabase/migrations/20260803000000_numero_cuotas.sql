-- Una obligacion mensual puede tener plazo fijo (ej. credito a 36
-- cuotas) o ser indefinida (ej. administracion, hasta que se
-- desactive a mano). numero_cuotas = null significa indefinida.

alter table obligaciones
  add column numero_cuotas smallint check (numero_cuotas > 0);
