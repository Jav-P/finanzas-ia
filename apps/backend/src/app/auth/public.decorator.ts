import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca un endpoint como accesible sin token (ej. consultar una
// invitacion antes de registrarse).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
