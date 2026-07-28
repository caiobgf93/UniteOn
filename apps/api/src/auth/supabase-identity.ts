import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SupabaseIdentity {
  userId: string;
  email: string;
  name: string;
}

/**
 * Verifica o JWT do Supabase Auth via JWKS remoto (chaves assimétricas —
 * padrão atual dos projetos Supabase). A chave pública é cacheada pelo `jose`.
 * Mesma lógica usada em apps/realtime/src/auth/identity.ts.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error('SUPABASE_URL não configurado');
    jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifySupabaseToken(token: string): Promise<SupabaseIdentity | null> {
  if (!process.env.SUPABASE_URL) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });
    const email = (payload.email as string) ?? '';
    const meta = payload.user_metadata as { name?: string } | undefined;
    const name = meta?.name || (email ? email.split('@')[0] : 'Colega');
    return { userId: payload.sub as string, email, name };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[uniteon] verifySupabaseToken falhou:', (err as Error).message);
    return null;
  }
}
