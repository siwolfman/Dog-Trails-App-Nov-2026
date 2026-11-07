import type { DataClient } from './client.ts'
import { createLocalClient } from './localClient.ts'
import { supabase } from './supabase.ts'
import { createSupabaseDataClient } from './supabaseClient.ts'

/**
 * Everything in the UI goes through this export.
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set it talks to Supabase; otherwise it uses
 * the bundled seed data and localStorage, so the app still runs with no backend.
 */
export const dataClient: DataClient = supabase
  ? createSupabaseDataClient(supabase)
  : createLocalClient()

export const backend: 'supabase' | 'local' = supabase ? 'supabase' : 'local'
