import { Route } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { SubirPago } from './features/subir-pago/subir-pago';
import { ObligacionForm } from './features/obligaciones/obligacion-form';
import { ObligacionDetalle } from './features/obligaciones/obligacion-detalle';
import { Ingresos } from './features/ingresos/ingresos';
import { Presupuestos } from './features/presupuestos/presupuestos';
import { Gastos } from './features/gastos/gastos';
import { Catalogos } from './features/catalogos/catalogos';
import { Creditos } from './features/creditos/creditos';
import { Analisis } from './features/analisis/analisis';
import { Cuentas } from './features/cuentas/cuentas';
import { Comprobantes } from './features/comprobantes/comprobantes';
import { CambiarPassword } from './features/cambiar-password/cambiar-password';
import { Login } from './features/auth/login';
import { Registro } from './features/auth/registro';
import { OlvidePassword } from './features/auth/olvide-password';
import { RestablecerPassword } from './features/auth/restablecer-password';
import { InvitacionAceptar } from './features/auth/invitacion-aceptar';
import { SinHogar } from './features/auth/sin-hogar';
import { Invitaciones } from './features/invitaciones/invitaciones';
import { authGuard, hogarGuard, soloInvitadoGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: Login, canActivate: [soloInvitadoGuard] },
  { path: 'registro', component: Registro, canActivate: [soloInvitadoGuard] },
  { path: 'olvide-password', component: OlvidePassword, canActivate: [soloInvitadoGuard] },
  // Sin guard: el link del correo debe funcionar aunque la persona
  // tenga sesion activa en ese navegador (otro dispositivo, etc).
  { path: 'restablecer-password', component: RestablecerPassword },
  { path: 'sin-hogar', component: SinHogar, canActivate: [authGuard] },
  { path: 'invitacion/:token', component: InvitacionAceptar, canActivate: [authGuard] },
  { path: 'invitar', component: Invitaciones, canActivate: [hogarGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [hogarGuard] },
  { path: 'subir-pago', component: SubirPago, canActivate: [hogarGuard] },
  { path: 'obligaciones/nueva', component: ObligacionForm, canActivate: [hogarGuard] },
  { path: 'obligaciones/:id/editar', component: ObligacionForm, canActivate: [hogarGuard] },
  { path: 'obligaciones/:id', component: ObligacionDetalle, canActivate: [hogarGuard] },
  { path: 'ingresos', component: Ingresos, canActivate: [hogarGuard] },
  { path: 'presupuestos', component: Presupuestos, canActivate: [hogarGuard] },
  { path: 'creditos', component: Creditos, canActivate: [hogarGuard] },
  { path: 'analisis', component: Analisis, canActivate: [hogarGuard] },
  { path: 'cuentas', component: Cuentas, canActivate: [hogarGuard] },
  { path: 'comprobantes', component: Comprobantes, canActivate: [hogarGuard] },
  { path: 'cambiar-password', component: CambiarPassword, canActivate: [hogarGuard] },
  { path: 'gastos', component: Gastos, canActivate: [hogarGuard] },
  { path: 'catalogos', component: Catalogos, canActivate: [hogarGuard] },
];
