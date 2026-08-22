import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionService } from './session.service';

function esperarListo(session: SessionService) {
  return toObservable(session.listo).pipe(
    filter((listo) => listo),
    take(1),
  );
}

// Exige una sesion de Supabase Auth valida.
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return esperarListo(session).pipe(
    map(() => (session.sesion() ? true : router.parseUrl('/login'))),
  );
};

// Ademas de sesion valida, exige que ya tenga un hogar asignado.
export const hogarGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return esperarListo(session).pipe(
    map(() => {
      if (!session.sesion()) return router.parseUrl('/login');
      if (!session.usuario()) return router.parseUrl('/registro');
      if (!session.usuario()?.hogarId) return router.parseUrl('/sin-hogar');
      return true;
    }),
  );
};

// Para /login y /registro: si ya hay sesion activa, no tiene sentido
// mostrar el formulario de nuevo (y ademas ahi es donde se veia la
// barra superior "fantasma" con datos de la sesion previa). Redirige
// a donde corresponda segun el estado de esa sesion.
export const soloInvitadoGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return esperarListo(session).pipe(
    map(() => {
      if (!session.sesion()) return true;
      if (session.usuario()?.hogarId) return router.parseUrl('/dashboard');
      if (session.usuario()) return router.parseUrl('/sin-hogar');
      // Sesion valida pero registro (fila en `usuarios`) sin completar
      // todavia: se deja seguir en /login o /registro.
      return true;
    }),
  );
};
