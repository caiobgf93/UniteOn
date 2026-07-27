import jwt from 'jsonwebtoken';
import type { Role } from '@uniteon/shared';

export interface Identity {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Resolve a identidade do handshake. Se o Supabase estiver configurado
 * (SUPABASE_JWT_SECRET), exige um JWT válido do Supabase Auth. Caso contrário,
 * aceita identidade mock de dev (`devName`/`devUserId`) — o `?name=` do cliente.
 */
export function resolveIdentity(auth: {
  token?: string;
  devName?: string;
  devUserId?: string;
}): Identity | null {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (secret) {
    if (!auth?.token) return null;
    try {
      const payload = jwt.verify(auth.token, secret) as {
        sub: string;
        email?: string;
        user_metadata?: { name?: string };
      };
      const email = payload.email ?? '';
      const name = payload.user_metadata?.name || (email ? email.split('@')[0] : 'Colega');
      return { userId: payload.sub, email, name, role: 'COLABORADOR' };
    } catch {
      return null;
    }
  }

  // Modo dev (sem Supabase): identidade mock.
  if (auth?.devName) {
    return {
      userId: auth.devUserId ?? auth.devName,
      email: '',
      name: auth.devName,
      role: 'COLABORADOR',
    };
  }
  return null;
}
