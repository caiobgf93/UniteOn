import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentIdentity } from '../auth/current-identity.decorator';
import type { SupabaseIdentity } from '../auth/supabase-identity';
import { MeService } from './me.service';

@Controller('me')
@UseGuards(SupabaseAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  async get(@CurrentIdentity() identity: SupabaseIdentity) {
    return this.me.ensureProfile(identity);
  }
}
