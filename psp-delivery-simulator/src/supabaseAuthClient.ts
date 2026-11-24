import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Only use a public browser key. VITE_* values are exposed in client JavaScript. */
export function createPspAuthClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error('Supabase authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw new Error('VITE_SUPABASE_URL must be your https://<project-ref>.supabase.co project URL.');
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('Use the Supabase publishable key (sb_publishable_), never a secret or service-role key.');
  }
  return createClient(url, publishableKey, {
    // Process the confirmation link's returned session when email verification
    // is enabled. The existing password login continues to work as before.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
