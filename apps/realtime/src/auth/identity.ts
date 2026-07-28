import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Role } from '@uniteon/shared';

export interface Identity {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Verifica o JWT do Supabase Auth via JWKS remoto (chaves assimétricas —
 * padrão atual dos projetos Supabase; NÃO usa mais o "JWT Secret" legado
 * HS256). A chave pública é buscada uma vez e cacheada pelo `jose`.
 *
 * IMPORTANTE: `authConfigured()` é uma função, não uma constante — o
 * `ConfigModule` do Nest só popula `process.env` durante o bootstrap da
 * aplicação, que roda DEPOIS deste módulo ser importado. Uma constante de
 * nível de módulo (`const x = Boolean(process.env.X)`) ficaria congelada em
 * `false` para sempre, mesmo com a env carregada em seguida.
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

export function authConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL);
}

async function verifySupabaseToken(token: string): Promise<Identity | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });
    const email = (payload.email as string) ?? '';
    const meta = payload.user_metadata as { name?: string } | undefined;
    const name = meta?.name || (email ? email.split('@')[0] : 'Colega');
    return { userId: payload.sub as string, email, name, role: 'COLABORADOR' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[uniteon] verifySupabaseToken falhou:', (err as Error).message);
    return null;
  }
}

/**
 * Resolve a identidade do handshake. Com Supabase configurado (SUPABASE_URL),
 * exige um JWT válido (verificado via JWKS). Caso contrário, aceita a
 * identidade mock de dev (`devName`/`devUserId`).
 */
export async function resolveIdentity(auth: {
  token?: string;
  devName?: string;
  devUserId?: string;
}): Promise<Identity | null> {
  if (authConfigured()) {
    if (!auth?.token) return null;
    return verifySupabaseToken(auth.token);
  }

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
