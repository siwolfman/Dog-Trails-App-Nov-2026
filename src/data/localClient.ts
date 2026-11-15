import seedJson from '@data/places.seed.json'
import type { DataClient, NewSundayPick } from './client.ts'
import { sanitizeProperties } from './sanitize.ts'
import { clearStorageKey, readJSON, writeJSON } from './storage.ts'
import {
  AppEventSchema,
  DisplayNameSchema,
  NewReportSchema,
  NewReviewSchema,
  SeedFileSchema,
  type AppEvent,
  type Profile,
  type Report,
  type Review,
  type SundayPick,
} from './schemas.ts'

/** Parsed once. A bad seed file fails loudly here (and in the seed test). */
const seed = SeedFileSchema.parse(seedJson)

const MAX_EVENTS = 2000

/** With no backend there are no accounts: one local person owns every review in this browser. */
const LOCAL_USER_ID = 'local-user'

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

    async getMyProfile() {
      return readJSON<Profile | null>('profile', null)
    },

    async createProfile(displayName) {
      const name = DisplayNameSchema.safeParse(displayName)
      if (!name.success) {
        return {
          kind: 'invalid',
          message: name.error.issues[0]?.message ?? 'Check the name.',
        }
      }
      const profile: Profile = { user_id: LOCAL_USER_ID, display_name: name.data }
      writeJSON('profile', profile)
      return { kind: 'ok', profile }
    },

    async listReviews(placeId) {
      return readJSON<Review[]>('reviews', [])
        .filter(
          (r) => r.place_id === placeId && (!r.hidden || r.user_id === LOCAL_USER_ID),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },

    async saveReview(input) {
      const parsed = NewReviewSchema.parse(input)
      const profile = readJSON<Profile | null>('profile', null)
      if (!profile) throw new Error('Choose a display name first.')
      const all = readJSON<Review[]>('reviews', [])
      const now = new Date().toISOString()
      const mine = all.find(
        (r) => r.place_id === parsed.place_id && r.user_id === LOCAL_USER_ID,
      )
      const review: Review = {
        id: mine?.id ?? newId('review'),
        user_id: LOCAL_USER_ID,
        display_name: profile.display_name,
        hidden: mine?.hidden ?? false,
        created_at: mine?.created_at ?? now,
        updated_at: now,
        place_id: parsed.place_id,
        rating: parsed.rating,
        comment: parsed.comment || null,
        gif: parsed.gif,
      }
      writeJSON('reviews', [review, ...all.filter((r) => r.id !== review.id)])
      return review
    },

    async deleteMyReview(placeId) {
      const all = readJSON<Review[]>('reviews', [])
      writeJSON(
        'reviews',
        all.filter((r) => !(r.place_id === placeId && r.user_id === LOCAL_USER_ID)),
      )
    },

    async listAllReviews() {
      return readJSON<Review[]>('reviews', []).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      )
    },

    async setReviewHidden(id, hidden) {
      writeJSON(
        'reviews',
        readJSON<Review[]>('reviews', []).map((r) =>
          r.id === id ? { ...r, hidden } : r,
        ),
      )
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
