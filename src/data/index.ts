import type { DataClient } from './client.ts'
import { createLocalClient } from './localClient.ts'

/**
 * Swap this one line for a Supabase-backed DataClient when the backend exists.
 * Everything in the UI goes through this export.
 */
export const dataClient: DataClient = createLocalClient()
