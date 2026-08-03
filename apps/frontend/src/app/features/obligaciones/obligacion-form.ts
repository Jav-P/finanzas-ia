import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
  protected readonly session = inject(SessionService);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly guardando = signal(false);
  protected readonly obligacionId = signal<string | null>(null);

  protected descripcion = '';
  protected monto: number | null = null;
  protected categoriaId = '';
  protected usuarioResponsableId = ''; // '' = compartida
  protected recurrencia: Recurrencia = 'mensual';
  protected diaVencimiento: number | null = null;
  protected numeroCuotas: number | null = null;
  protected fechaInicio = '';

  ngOnInit(): void {
    this.api.categorias(this.session.hogarId).subscribe((categorias) => {
      this.categorias.set(categorias);
      if (categorias.length && !this.categoriaId) this.categoriaId = categorias[0].id;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.obligacionId.set(id);
      this.api.obligacion(id).subscribe((obligacion) => {
        this.descripcion = obligacion.descripcion;
        this.monto = obligacion.monto;
        this.categoriaId = obligacion.categoriaId;
        this.usuarioResponsableId = obligacion.usuarioResponsableId ?? '';
        this.recurrencia = obligacion.recurrencia;
        this.diaVencimiento = obligacion.diaVencimiento;
        this.numeroCuotas = obligacion.numeroCuotas;
        this.fechaInicio = obligacion.fechaInicio;
      });
    }
  }

  guardar(): void {
    if (!this.descripcion || !this.monto || !this.categoriaId || !this.fechaInicio) return;

    this.guardando.set(true);
    const dto = {
      usuarioResponsableId: this.usuarioResponsableId || null,
      categoriaId: this.categoriaId,
      descripcion: this.descripcion,
      monto: this.monto,
      recurrencia: this.recurrencia,
      diaVencimiento: this.recurrencia === 'mensual' ? this.diaVencimiento : null,
      numeroCuotas: this.recurrencia === 'mensual' ? this.numeroCuotas : null,
      fechaInicio: this.fechaInicio,
    };

    const id = this.obligacionId();
    const request = id
      ? this.api.editarObligacion(id, dto)
      : this.api.crearObligacion({ ...dto, hogarId: this.session.hogarId });

    request.subscribe({
      // /obligaciones/:id es la vista de detalle de una INSTANCIA, no de
      // la obligacion (plantilla) que se acaba de editar, asi que en
      // ambos casos volvemos al dashboard.
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => this.guardando.set(false),
    });
  }
}
