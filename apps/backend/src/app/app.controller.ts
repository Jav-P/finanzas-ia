import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';
import { Public } from './auth/public.decorator';

@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health/db')
  async checkDb() {
    const { count, error } = await this.supabase.client
      .from('categorias')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true, categorias: count };
  }
}
