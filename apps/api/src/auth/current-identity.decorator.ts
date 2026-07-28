import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SupabaseIdentity } from './supabase-identity';

export const CurrentIdentity = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SupabaseIdentity => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.identity as SupabaseIdentity;
  },
);
