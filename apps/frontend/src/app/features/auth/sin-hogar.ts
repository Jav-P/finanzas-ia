import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-sin-hogar',
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './sin-hogar.html',
})
export class SinHogar {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  async cerrarSesion(): Promise<void> {
    await this.session.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
