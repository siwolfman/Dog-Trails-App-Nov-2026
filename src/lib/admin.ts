import type { AppEvent, Place } from '@/data/schemas.ts'
import { getDisplayRule } from './dogStatus.ts'

export const MIN_PICKS = 3
export const MAX_PICKS = 5

export interface DraftPick {
  place_id: string
  note: string
}

export function validatePicks(
  picks: DraftPick[],
  places: Place[],
  today: string,
): string[] {
  const errors: string[] = []
  if (picks.length < MIN_PICKS || picks.length > MAX_PICKS) {
    errors.push(`Pick ${MIN_PICKS} to ${MAX_PICKS} places (you have ${picks.length}).`)
  }
  if (new Set(picks.map((p) => p.place_id)).size !== picks.length) {
    errors.push('Each place can appear only once.')
  }
  for (const p of picks) {
    const place = places.find((x) => x.id === p.place_id)
    if (!place) {
      errors.push('A picked place no longer exists.')
    } else if (getDisplayRule(place, today).state === 'unverified') {
      errors.push(`${place.name} is unverified. Verify it or pick another place.`)
    }
    if (p.note.length > 280) errors.push('Notes can be up to 280 characters.')
  }
  return errors
}

function csvCell(v: unknown): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function eventsToCSV(events: AppEvent[]): string {
  const header = ['id', 'created_at', 'event_name', 'place_id', 'properties']
  const rows = events.map((e) =>
    [e.id, e.created_at, e.event_name, e.place_id ?? '', JSON.stringify(e.properties)]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export function countByName(events: AppEvent[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of events) out[e.event_name] = (out[e.event_name] ?? 0) + 1
  return out
}

/**
 * PLACEHOLDER gate. VITE_ env vars are bundled into the page, so this is NOT security.
 * It only keeps the admin screen out of casual sight until Supabase Auth + RLS replace it.
 */
export function checkAdminPassword(input: string, expected: string | undefined): boolean {
  if (!expected) return false
  if (input.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++)
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
