import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataClient } from './client.ts'
import { sanitizeProperties } from './sanitize.ts'
import {
  AppEventSchema,
  NewReportSchema,
  PlaceRuleHistorySchema,
  PlaceSchema,
  ReportSchema,
  SundayPickSchema,
  type Place,
  type Report,
} from './schemas.ts'

/** Everything except the PostGIS `geog` column, which the UI does not use. */
const PLACE_COLUMNS =
  'id,name,slug,place_type,agency,lat,lng,region,city,dog_status,rule_summary,off_leash_notes,' +
  'source_url,verification_status,verified_on,verified_by,verification_note,recheck_days,' +
  'details_basis,hazards,water_access,shade_level,parking_notes,typical_duration_minutes,' +
  'created_at,updated_at'

const MAX_EVENTS = 2000

function fail(action: string, error: { message: string }): never {
  throw new Error(`${action}: ${error.message}`)
}

/** Parse rows from the database and drop any that break the data-integrity rules. */
function parseRows<T>(
  rows: unknown[] | null,
  parse: (
    row: unknown,
  ) => { success: true; data: T } | { success: false; error: unknown },
  label: string,
): T[] {
  const out: T[] = []
  for (const row of rows ?? []) {
    const r = parse(row)
    if (r.success) out.push(r.data)
    else console.error(`Skipping invalid ${label} row from the database`, r.error)
  }
  return out
}

/**
 * DataClient backed by Supabase. Row Level Security decides what each caller may do:
 * anyone can read places and picks and file reports/events; only admins can read reports
 * and events or change places and picks. Those admin calls simply return nothing (or throw)
 * for everyone else.
 */
export function createSupabaseDataClient(sb: SupabaseClient): DataClient {
  let places: Promise<Place[]> | null = null

  async function loadPlaces(): Promise<Place[]> {
    const { data, error } = await sb.from('places').select(PLACE_COLUMNS).order('name')
    if (error) fail('Could not load places', error)
    return parseRows(data, (r) => PlaceSchema.safeParse(r), 'place')
  }

  return {
    listPlaces() {
      // Cached per page load; a failure is not cached so a retry can succeed.
      places ??= loadPlaces()
        .then((list) => {
          // An empty list can mean "not signed in" (RLS hides rows rather than erroring): retry later.
          if (list.length === 0) places = null
          return list
        })
        .catch((e: unknown) => {
          places = null
          throw e
        })
      return places
    },

    async getPlace(slug) {
      const { data, error } = await sb
        .from('places')
        .select(PLACE_COLUMNS)
        .eq('slug', slug)
        .maybeSingle()
      if (error) fail('Could not load place', error)
      if (!data) return null
      const parsed = PlaceSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Skipping invalid place row from the database', parsed.error)
        return null
      }
      return parsed.data
    },

    async listPlaceHistory(placeId) {
      const { data, error } = await sb
        .from('place_rule_history')
        .select('*')
        .eq('place_id', placeId)
        .order('changed_on', { ascending: false })
      if (error) fail('Could not load rule history', error)
      return parseRows(data, (r) => PlaceRuleHistorySchema.safeParse(r), 'history')
    },

    async submitReport(input) {
      const parsed = NewReportSchema.parse(input)
      const report: Report = {
        ...parsed,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        status: 'open',
      }
      // Anonymous visitors may insert but not read, so no .select() here.
      const { error } = await sb.from('reports').insert({
        id: report.id,
        place_id: report.place_id,
        report_type: report.report_type,
        message: report.message,
      })
      if (error) fail('Could not save report', error)
      return report
    },

    async listReports() {
      const { data, error } = await sb
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) fail('Could not load reports', error)
      return parseRows(data, (r) => ReportSchema.safeParse(r), 'report')
    },

    async updateReportStatus(id, status) {
      const { error } = await sb.from('reports').update({ status }).eq('id', id)
      if (error) fail('Could not update report', error)
    },

    async getSundayPicks(weekStart) {
      let week = weekStart ?? null
      if (!week) {
        const { data, error } = await sb
          .from('sunday_picks')
          .select('week_start')
          .order('week_start', { ascending: false })
          .limit(1)
        if (error) fail('Could not load Sunday picks', error)
        week = (data?.[0]?.week_start as string | undefined) ?? null
      }
      if (!week) return { weekStart: null, picks: [] }
      const { data, error } = await sb
        .from('sunday_picks')
        .select('*')
        .eq('week_start', week)
        .order('sort_order')
      if (error) fail('Could not load Sunday picks', error)
      return {
        weekStart: week,
        picks: parseRows(data, (r) => SundayPickSchema.safeParse(r), 'pick'),
      }
    },

    async saveSundayPicks(weekStart, picks) {
      const { error } = await sb.rpc('save_sunday_picks', {
        p_week: weekStart,
        p_picks: picks.map((p) => ({ place_id: p.place_id, note: p.note.slice(0, 280) })),
      })
      if (error) fail('Could not save Sunday picks', error)
      const saved = await this.getSundayPicks(weekStart)
      return saved.picks
    },

    async logEvent(name, placeId, properties) {
      // Analytics must never break the app: swallow every failure.
      try {
        await sb.from('events').insert({
          event_name: name,
          place_id: placeId,
          properties: sanitizeProperties(properties),
        })
      } catch {
        /* ignore */
      }
    },

    async listEvents() {
      const { data, error } = await sb
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_EVENTS)
      if (error) fail('Could not load events', error)
      return parseRows(data, (r) => AppEventSchema.safeParse(r), 'event')
    },

    async clearEvents() {
      const { error } = await sb
        .from('events')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00Z')
      if (error) fail('Could not clear events', error)
    },
  }
}
