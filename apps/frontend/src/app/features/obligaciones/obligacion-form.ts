import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { Categoria, RecurrenciaObligacion } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { MontoInputDirective } from '../../core/monto-input.directive';

@Component({
  selector: 'app-obligacion-form',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MontoInputDirective,
  ],
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
  protected recurrencia: RecurrenciaObligacion = 'mensual';
  protected diaVencimiento: number | null = null;
  protected numeroCuotas: number | null = null;
  protected fechaInicio = '';
  protected esCredito = false;
  protected banco = '';
  protected tasaInteres: number | null = null;

  ngOnInit(): void {
    this.api.categorias().subscribe((categorias) => {
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
        this.esCredito = !!obligacion.banco;
        this.banco = obligacion.banco ?? '';
        this.tasaInteres = obligacion.tasaInteres;
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
      numeroCuotas: this.recurrencia !== 'unica' ? this.numeroCuotas : null,
      fechaInicio: this.fechaInicio,
      banco: this.esCredito ? this.banco || null : null,
      tasaInteres: this.esCredito ? this.tasaInteres : null,
    };

    const id = this.obligacionId();
    const request = id ? this.api.editarObligacion(id, dto) : this.api.crearObligacion(dto);

    request.subscribe({
      // /obligaciones/:id es la vista de detalle de una INSTANCIA, no de
      // la obligacion (plantilla) que se acaba de editar, asi que en
      // ambos casos volvemos al dashboard.
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => this.guardando.set(false),
    });
  }
}
