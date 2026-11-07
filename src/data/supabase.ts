import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/**
 * The Supabase browser client, or null when the env vars are not set (the app then falls back
 * to the bundled seed + localStorage). The key is the PUBLISHABLE (anon) key: it is meant to be
 * public. What it can do is limited by Row Level Security in supabase/migrations.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null
