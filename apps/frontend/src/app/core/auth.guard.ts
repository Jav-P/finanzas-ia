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
    map(() => (session.session() ? true : router.parseUrl('/login'))),
  );
};

// Ademas de sesion valida, exige que ya tenga un hogar asignado.
export const hogarGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return esperarListo(session).pipe(
    map(() => {
      if (!session.session()) return router.parseUrl('/login');
      if (!session.usuario()) return router.parseUrl('/registro');
      if (!session.usuario()?.hogarId) return router.parseUrl('/sin-hogar');
      return true;
    }),
  );
};
