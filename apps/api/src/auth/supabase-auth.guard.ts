import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { verifySupabaseToken, type SupabaseIdentity } from './supabase-identity';

declare module 'express' {
  interface Request {
    identity?: SupabaseIdentity;
  }
}

/** Exige um Bearer token válido do Supabase Auth. */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const identity = token ? verifySupabaseToken(token) : null;
    if (!identity) throw new UnauthorizedException('Token inválido ou ausente');
    req.identity = identity;
    return true;
  }
}
