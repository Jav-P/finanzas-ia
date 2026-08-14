import { Route } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { ObligacionForm } from './features/obligaciones/obligacion-form';
import { ObligacionDetalle } from './features/obligaciones/obligacion-detalle';
import { Ingresos } from './features/ingresos/ingresos';
import { Presupuestos } from './features/presupuestos/presupuestos';
import { Gastos } from './features/gastos/gastos';
import { Catalogos } from './features/catalogos/catalogos';
import { Creditos } from './features/creditos/creditos';
import { Login } from './features/auth/login';
import { Registro } from './features/auth/registro';
import { InvitacionAceptar } from './features/auth/invitacion-aceptar';
import { SinHogar } from './features/auth/sin-hogar';
import { Invitaciones } from './features/invitaciones/invitaciones';
import { authGuard, hogarGuard, soloInvitadoGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: Login, canActivate: [soloInvitadoGuard] },
  { path: 'registro', component: Registro, canActivate: [soloInvitadoGuard] },
  { path: 'sin-hogar', component: SinHogar, canActivate: [authGuard] },
  { path: 'invitacion/:token', component: InvitacionAceptar, canActivate: [authGuard] },
  { path: 'invitar', component: Invitaciones, canActivate: [hogarGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [hogarGuard] },
  { path: 'obligaciones/nueva', component: ObligacionForm, canActivate: [hogarGuard] },
  { path: 'obligaciones/:id/editar', component: ObligacionForm, canActivate: [hogarGuard] },
  { path: 'obligaciones/:id', component: ObligacionDetalle, canActivate: [hogarGuard] },
  { path: 'ingresos', component: Ingresos, canActivate: [hogarGuard] },
  { path: 'presupuestos', component: Presupuestos, canActivate: [hogarGuard] },
  { path: 'creditos', component: Creditos, canActivate: [hogarGuard] },
  { path: 'gastos', component: Gastos, canActivate: [hogarGuard] },
  { path: 'catalogos', component: Catalogos, canActivate: [hogarGuard] },
];
