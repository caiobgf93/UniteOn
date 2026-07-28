import jwt from 'jsonwebtoken';

export interface SupabaseIdentity {
  userId: string;
  email: string;
  name: string;
}

/** Verifica o JWT do Supabase Auth (mesmo segredo usado pelo realtime). */
export function verifySupabaseToken(token: string): SupabaseIdentity | null {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as {
      sub: string;
      email?: string;
      user_metadata?: { name?: string };
    };
    const email = payload.email ?? '';
    const name = payload.user_metadata?.name || (email ? email.split('@')[0] : 'Colega');
    return { userId: payload.sub, email, name };
  } catch {
    return null;
  }
}
