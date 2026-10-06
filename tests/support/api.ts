import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { PASSWORD, users, type UserKey } from './users';

/**
 * A real Supabase client signed in as a demo user, talking to the same REST API the
 * browser uses. This is how the suite proves authorization lives in the database:
 * these calls bypass the React UI entirely.
 */
export async function apiAs(key: UserKey): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email: users[key].email, password: PASSWORD });
  if (error) throw new Error(`Could not sign in as ${key}: ${error.message}`);
  return client;
}

export function anonClient(): SupabaseClient<Database> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set for tests (see .env.example).');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
export const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
