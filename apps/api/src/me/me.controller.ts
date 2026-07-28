import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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

  @Patch('avatar')
  async updateAvatar(
    @CurrentIdentity() identity: SupabaseIdentity,
    @Body('avatarConfig') avatarConfig: unknown,
  ) {
    return { avatarConfig: await this.me.updateAvatar(identity.userId, avatarConfig) };
  }
}
