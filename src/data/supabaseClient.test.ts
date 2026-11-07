import type { SupabaseClient } from '@supabase/supabase-js'
import { vi } from 'vitest'
import seedJson from '@data/places.seed.json'
import { createSupabaseDataClient } from './supabaseClient.ts'
import { SeedFileSchema } from './schemas.ts'

type Result = { data?: unknown; error?: { message: string } | null }
type Call = [string, ...unknown[]]

/** A chainable, awaitable stand-in for supabase-js query builders. */
function fakeSupabase(results: Record<string, Result> = {}) {
  const calls: Call[] = []
  const builder = (key: string) => {
    const q: unknown = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            const r = results[key] ?? { data: [], error: null }
            return (resolve: (v: Result) => unknown) => resolve({ error: null, ...r })
          }
          return (...args: unknown[]) => {
            calls.push([`${key}.${prop}`, ...args])
            return q
          }
        },
      },
    )
    return q
  }
  const sb = {
    from: (table: string) => builder(table),
    rpc: (fn: string, args: unknown) => {
      calls.push([`rpc.${fn}`, args])
      return builder(`rpc.${fn}`)
    },
  } as unknown as SupabaseClient
  return { sb, calls }
}

const seedPlace = SeedFileSchema.parse(seedJson).places[0]!
const row = (over: Record<string, unknown> = {}) => ({
  ...seedPlace,
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-11-07T00:00:00+00:00',
  updated_at: '2026-11-07T00:00:00+00:00',
  ...over,
})

test('listPlaces parses rows (including Postgres timestamp offsets) and caches', async () => {
  const { sb, calls } = fakeSupabase({ places: { data: [row()] } })
  const client = createSupabaseDataClient(sb)
  const places = await client.listPlaces()
  expect(places).toHaveLength(1)
  expect(places[0]?.slug).toBe(seedPlace.slug)
  await client.listPlaces()
  expect(calls.filter(([c]) => c === 'places.select')).toHaveLength(1)
})

test('listPlaces never includes the geog column', async () => {
  const { sb, calls } = fakeSupabase({ places: { data: [] } })
  await createSupabaseDataClient(sb).listPlaces()
  const select = calls.find(([c]) => c === 'places.select')!
  expect(String(select[1])).not.toContain('geog')
})

test('a row that breaks the integrity rules is skipped, not shown', async () => {
  const bad = row({
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'bad',
    verification_status: 'needs_verification',
    dog_status: 'off_leash_ok', // a confident rule on an unverified place
  })
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { sb } = fakeSupabase({ places: { data: [row(), bad] } })
  const places = await createSupabaseDataClient(sb).listPlaces()
  expect(places.map((p) => p.slug)).toEqual([seedPlace.slug])
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})

test('a failed load throws and is not cached', async () => {
  const results: Record<string, Result> = { places: { error: { message: 'boom' } } }
  const { sb } = fakeSupabase(results)
  const client = createSupabaseDataClient(sb)
  await expect(client.listPlaces()).rejects.toThrow(/boom/)
  results.places = { data: [row()] }
  expect(await client.listPlaces()).toHaveLength(1)
})

test('submitReport validates, inserts without selecting, and returns the report', async () => {
  const { sb, calls } = fakeSupabase()
  const client = createSupabaseDataClient(sb)
  await expect(
    client.submitReport({ place_id: 'p', report_type: 'other', message: 'no' }),
  ).rejects.toThrow()
  expect(calls.some(([c]) => c === 'reports.insert')).toBe(false)

  const report = await client.submitReport({
    place_id: 'p',
    report_type: 'closure',
    message: 'Trail closed for repairs',
  })
  expect(report.status).toBe('open')
  const insert = calls.find(([c]) => c === 'reports.insert')!
  expect(insert[1]).toMatchObject({
    place_id: 'p',
    report_type: 'closure',
    message: 'Trail closed for repairs',
  })
  expect(calls.some(([c]) => c === 'reports.select')).toBe(false)
})

test('saveSundayPicks goes through the atomic admin RPC', async () => {
  const { sb, calls } = fakeSupabase({ sunday_picks: { data: [] } })
  await createSupabaseDataClient(sb).saveSundayPicks('2026-11-09', [
    { place_id: 'a', note: 'x'.repeat(400) },
    { place_id: 'b', note: 'ok' },
  ])
  const rpc = calls.find(([c]) => c === 'rpc.save_sunday_picks')!
  const args = rpc[1] as { p_week: string; p_picks: { place_id: string; note: string }[] }
  expect(args.p_week).toBe('2026-11-09')
  expect(args.p_picks.map((p) => p.place_id)).toEqual(['a', 'b'])
  expect(args.p_picks[0]?.note).toHaveLength(280)
})

test('saveSundayPicks surfaces database errors', async () => {
  const { sb } = fakeSupabase({
    'rpc.save_sunday_picks': { error: { message: 'not authorized' } },
  })
  await expect(
    createSupabaseDataClient(sb).saveSundayPicks('2026-11-09', []),
  ).rejects.toThrow(/not authorized/)
})

test('getSundayPicks with no week finds the newest week first', async () => {
  const { sb, calls } = fakeSupabase({ sunday_picks: { data: [] } })
  const r = await createSupabaseDataClient(sb).getSundayPicks()
  expect(r).toEqual({ weekStart: null, picks: [] })
  expect(calls.some(([c, a]) => c === 'sunday_picks.order' && a === 'week_start')).toBe(
    true,
  )
})

test('logEvent sanitizes properties and never throws', async () => {
  const { sb, calls } = fakeSupabase()
  await createSupabaseDataClient(sb).logEvent('place_viewed', 'p', {
    slug: 'a'.repeat(500),
  })
  const insert = calls.find(([c]) => c === 'events.insert')!
  const payload = insert[1] as { properties: { slug: string } }
  expect(payload.properties.slug).toHaveLength(100)

  const broken = {
    from: () => {
      throw new Error('network down')
    },
  } as unknown as SupabaseClient
  await expect(
    createSupabaseDataClient(broken).logEvent('filter_used', null),
  ).resolves.toBeUndefined()
})

test('admin reads and clears fail loudly on error', async () => {
  const { sb } = fakeSupabase({
    reports: { error: { message: 'denied' } },
    events: { error: { message: 'denied' } },
  })
  const client = createSupabaseDataClient(sb)
  await expect(client.listReports()).rejects.toThrow(/denied/)
  await expect(client.listEvents()).rejects.toThrow(/denied/)
  await expect(client.clearEvents()).rejects.toThrow(/denied/)
})
