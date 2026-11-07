import seedJson from '@data/places.seed.json'
import type { DataClient, NewSundayPick } from './client.ts'
import { sanitizeProperties } from './sanitize.ts'
import { clearStorageKey, readJSON, writeJSON } from './storage.ts'
import {
  AppEventSchema,
  NewReportSchema,
  SeedFileSchema,
  type AppEvent,
  type Report,
  type SundayPick,
} from './schemas.ts'

/** Parsed once. A bad seed file fails loudly here (and in the seed test). */
const seed = SeedFileSchema.parse(seedJson)

const MAX_EVENTS = 2000

function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}-${rand}`
}

export function createLocalClient(): DataClient {
  return {
    async listPlaces() {
      return seed.places
    },

    async getPlace(slug) {
      return seed.places.find((p) => p.slug === slug) ?? null
    },

    async listPlaceHistory(placeId) {
      return seed.place_rule_history
        .filter((h) => h.place_id === placeId)
        .sort((a, b) => b.changed_on.localeCompare(a.changed_on))
    },

    async submitReport(input) {
      const parsed = NewReportSchema.parse(input)
      const report: Report = {
        ...parsed,
        id: newId('report'),
        created_at: new Date().toISOString(),
        status: 'open',
      }
      writeJSON('reports', [report, ...readJSON<Report[]>('reports', [])])
      return report
    },

    async listReports() {
      return readJSON<Report[]>('reports', [])
    },

    async updateReportStatus(id, status) {
      const reports = readJSON<Report[]>('reports', []).map((r) =>
        r.id === id ? { ...r, status } : r,
      )
      writeJSON('reports', reports)
    },

    async getSundayPicks(weekStart) {
      const edited = readJSON<Record<string, SundayPick[]>>('sunday_picks', {})
      const byWeek = new Map<string, SundayPick[]>()
      for (const p of seed.sunday_picks)
        byWeek.set(p.week_start, [...(byWeek.get(p.week_start) ?? []), p])
      for (const [week, picks] of Object.entries(edited)) byWeek.set(week, picks)

      const week =
        weekStart ??
        [...byWeek.keys()]
          .filter((w) => (byWeek.get(w) ?? []).length > 0)
          .sort()
          .at(-1) ??
        null
      if (!week) return { weekStart: null, picks: [] }
      const picks = [...(byWeek.get(week) ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      )
      return { weekStart: week, picks }
    },

    async saveSundayPicks(weekStart, picks: NewSundayPick[]) {
      const saved: SundayPick[] = picks.map((p, i) => ({
        id: `pick-${weekStart}-${i + 1}`,
        week_start: weekStart,
        place_id: p.place_id,
        note: p.note.slice(0, 280),
        sort_order: i,
      }))
      const edited = readJSON<Record<string, SundayPick[]>>('sunday_picks', {})
      writeJSON('sunday_picks', { ...edited, [weekStart]: saved })
      return saved
    },

    async logEvent(name, placeId, properties) {
      const event: AppEvent = AppEventSchema.parse({
        id: newId('evt'),
        event_name: name,
        place_id: placeId,
        properties: sanitizeProperties(properties),
        created_at: new Date().toISOString(),
      })
      const events = readJSON<AppEvent[]>('events', [])
      writeJSON('events', [event, ...events].slice(0, MAX_EVENTS))
    },

    async listEvents() {
      return readJSON<AppEvent[]>('events', [])
    },

    async clearEvents() {
      clearStorageKey('events')
    },
  }
}

export { sanitizeProperties }
