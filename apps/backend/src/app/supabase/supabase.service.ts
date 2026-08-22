import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);

  // Rol de servicio: bypassea RLS, se usa para todo el CRUD de la app.
  readonly client: SupabaseClient;
  // Rol anonimo: el unico que debe usarse para signUp/signInWithPassword/
  // refreshSession (son operaciones de GoTrue, no de la base de datos).
  readonly authClient: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    this.client = createClient(url, this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'));
    this.authClient = createClient(url, this.config.getOrThrow<string>('SUPABASE_ANON_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // Se corre una sola vez al arrancar el backend. El objetivo es que un
  // Supabase/Docker caido se note de inmediato en el log de arranque,
  // en vez de descubrirse recien cuando falla el primer request real.
  async onModuleInit(): Promise<void> {
    try {
      const { error } = await this.client.from('hogares').select('id', { count: 'exact', head: true });
      if (error) throw error;
      this.logger.log('Conexion a Supabase OK');
    } catch (error) {
      this.logger.error(
        'No se pudo conectar a Supabase. Verifica que Docker Desktop este corriendo y que ' +
          '"npx supabase status" muestre los servicios activos.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
