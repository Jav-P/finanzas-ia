import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Categoria, Recurrencia } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-obligacion-form',
  imports: [FormsModule],
  templateUrl: './obligacion-form.html',
})
export class ObligacionForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly guardando = signal(false);

  protected descripcion = '';
  protected monto: number | null = null;
  protected categoriaId = '';
  protected usuarioResponsableId = ''; // '' = compartida
  protected recurrencia: Recurrencia = 'mensual';
  protected diaVencimiento: number | null = null;
  protected fechaInicio = '';

  ngOnInit(): void {
    this.api.categorias(this.session.hogarId).subscribe((categorias) => {
      this.categorias.set(categorias);
      if (categorias.length) this.categoriaId = categorias[0].id;
    });
  }

  guardar(): void {
    if (!this.descripcion || !this.monto || !this.categoriaId || !this.fechaInicio) return;

    this.guardando.set(true);
    this.api
      .crearObligacion({
        hogarId: this.session.hogarId,
        usuarioResponsableId: this.usuarioResponsableId || null,
        categoriaId: this.categoriaId,
        descripcion: this.descripcion,
        monto: this.monto,
        recurrencia: this.recurrencia,
        diaVencimiento: this.recurrencia === 'mensual' ? this.diaVencimiento : null,
        fechaInicio: this.fechaInicio,
      })
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: () => this.guardando.set(false),
      });
  }
}
