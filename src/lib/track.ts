import { dataClient } from '@/data/index.ts'
import type { EventName } from '@/data/schemas.ts'

/**
 * Privacy-friendly event logging. First-party only, no cookies, no IP, no account.
 * The session id lives in memory for this tab (it vanishes on reload) and only lets us
 * count distinct visits within one sitting.
 */
const session =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)

export function track(
  name: EventName,
  placeId: string | null = null,
  properties: Record<string, string | number | boolean> = {},
): void {
  // Never let analytics break the app.
  dataClient.logEvent(name, placeId, { ...properties, session }).catch(() => {})
}
