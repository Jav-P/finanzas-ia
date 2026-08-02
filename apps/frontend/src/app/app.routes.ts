import { Route } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { ObligacionForm } from './features/obligaciones/obligacion-form';
import { ObligacionDetalle } from './features/obligaciones/obligacion-detalle';
import { Ingresos } from './features/ingresos/ingresos';
import { Presupuestos } from './features/presupuestos/presupuestos';
import { Gastos } from './features/gastos/gastos';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: Dashboard },
  { path: 'obligaciones/nueva', component: ObligacionForm },
  { path: 'obligaciones/:id', component: ObligacionDetalle },
  { path: 'ingresos', component: Ingresos },
  { path: 'presupuestos', component: Presupuestos },
  { path: 'gastos', component: Gastos },
];
