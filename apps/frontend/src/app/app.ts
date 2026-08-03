import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService } from './core/api.service';
import { SessionService } from './core/session.service';
import { NotificationService } from './core/notification.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly session = inject(SessionService);
  protected readonly notification = inject(NotificationService);

  ngOnInit(): void {
    this.api.usuarios(this.session.hogarId).subscribe((usuarios) => {
      this.session.setUsuarios(usuarios);
      if (!this.session.usuarioActualId() && usuarios.length) {
        this.session.elegirUsuario(usuarios[0].id);
      }
    });
  }

  elegirUsuario(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.session.elegirUsuario(id);
  }
}
