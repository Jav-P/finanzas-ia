import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import type { CreditoResumen } from '@finanzas-ia/shared-types';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-creditos',
  imports: [DecimalPipe, MatCardModule],
  templateUrl: './creditos.html',
})
export class Creditos implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly creditos = signal<CreditoResumen[]>([]);

  ngOnInit(): void {
    this.api.creditos().subscribe((creditos) => this.creditos.set(creditos));
  }
}
