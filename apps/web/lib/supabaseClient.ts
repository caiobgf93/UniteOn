import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** true quando o Supabase Auth está configurado (senão o app cai no mock de dev). */
export const authConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Cliente Supabase (browser). Retorna null se o Auth não estiver configurado. */
export function getSupabase(): SupabaseClient | null {
  if (!authConfigured) return null;
  if (!client) client = createClient(url, anonKey, { auth: { persistSession: true } });
  return client;
}
