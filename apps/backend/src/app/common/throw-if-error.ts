import { InternalServerErrorException } from '@nestjs/common';

export function throwIfError(error: { message: string } | null | undefined): void {
  if (error) {
    throw new InternalServerErrorException(error.message);
  }
}
