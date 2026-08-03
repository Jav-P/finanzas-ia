import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

const MENSAJE_GENERICO = 'El servicio no está disponible en este momento. Intenta más tarde.';

// El backend responde 503 cuando falla Claude API (OCR de factura o
// de extracto), con un mensaje ya pensado para mostrar al usuario.
// Este interceptor lo muestra como popup sin que cada componente
// tenga que manejarlo por separado.
export const serviceUnavailableInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 503) {
        notification.error(error.error?.message ?? MENSAJE_GENERICO);
      }
      return throwError(() => error);
    }),
  );
};
