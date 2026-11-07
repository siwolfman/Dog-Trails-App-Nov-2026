import { beforeEach, describe, expect, test } from 'vitest'
import seedJson from '@data/places.seed.json'
import { createLocalClient, sanitizeProperties } from './localClient.ts'
import { PlaceSchema, SeedFileSchema } from './schemas.ts'
import { getDisplayRule } from '@/lib/dogStatus.ts'

describe('seed data integrity', () => {
  const seed = SeedFileSchema.parse(seedJson)

  test('has 15-20+ places across at least 3 agencies', () => {
    expect(seed.places.length).toBeGreaterThanOrEqual(15)
    expect(new Set(seed.places.map((p) => p.agency)).size).toBeGreaterThanOrEqual(3)
  })

  test('every place has an https source_url', () => {
    for (const p of seed.places) expect(p.source_url).toMatch(/^https:\/\//)
  })

  test('slugs and ids are unique', () => {
    expect(new Set(seed.places.map((p) => p.slug)).size).toBe(seed.places.length)
    expect(new Set(seed.places.map((p) => p.id)).size).toBe(seed.places.length)
  })

  test('needs_verification places carry no rule and display as unverified', () => {
    const unverified = seed.places.filter(
      (p) => p.verification_status === 'needs_verification',
    )
    expect(unverified.length).toBeGreaterThan(0)
    for (const p of unverified) {
      expect(p.dog_status).toBeNull()
      expect(p.rule_summary).toBeNull()
      expect(p.verification_note).toBeTruthy()
      expect(getDisplayRule(p, '2026-11-08').state).toBe('unverified')
    }
  })

  test('verified places have a date, a verifier and history', () => {
    for (const p of seed.places.filter((p) => p.verification_status === 'verified')) {
      expect(p.verified_on).toBeTruthy()
      expect(p.verified_by).toBeTruthy()
      expect(seed.place_rule_history.some((h) => h.place_id === p.id)).toBe(true)
    }
  })

  test('schema rejects a confident rule on an unverified place', () => {
    const base = seed.places.find((p) => p.verification_status === 'needs_verification')!
    const bad = PlaceSchema.safeParse({ ...base, dog_status: 'off_leash_ok' })
    expect(bad.success).toBe(false)
  })

  test('sunday picks reference real, verified places', () => {
    for (const pick of seed.sunday_picks) {
      const place = seed.places.find((p) => p.id === pick.place_id)
      expect(place?.verification_status).toBe('verified')
    }
  })
})

describe('local client', () => {
  beforeEach(() => window.localStorage.clear())

  test('lists places and finds one by slug', async () => {
    const c = createLocalClient()
    expect((await c.listPlaces()).length).toBeGreaterThan(10)
    expect((await c.getPlace('point-isabel'))?.name).toMatch(/Point Isabel/)
    expect(await c.getPlace('nope')).toBeNull()
  })

  test('reports validate and persist', async () => {
    const c = createLocalClient()
    await expect(
      c.submitReport({ place_id: 'pl-point-isabel', report_type: 'other', message: 'x' }),
    ).rejects.toThrow()
    const r = await c.submitReport({
      place_id: 'pl-point-isabel',
      report_type: 'wrong_rule',
      message: 'Sign says leash only now',
    })
    expect(r.status).toBe('open')
    const list = await createLocalClient().listReports()
    expect(list).toHaveLength(1)
    await c.updateReportStatus(r.id, 'resolved')
    expect((await c.listReports())[0]?.status).toBe('resolved')
  })

  test('sunday picks default to seed, then edits override', async () => {
    const c = createLocalClient()
    const seeded = await c.getSundayPicks()
    expect(seeded.picks.length).toBeGreaterThanOrEqual(3)
    await c.saveSundayPicks(seeded.weekStart!, [
      { place_id: 'pl-lands-end', note: 'Coast' },
      { place_id: 'pl-point-isabel', note: 'Bay' },
      { place_id: 'pl-windy-hill', note: 'Hills' },
    ])
    const after = await c.getSundayPicks()
    expect(after.picks.map((p) => p.place_id)).toEqual([
      'pl-lands-end',
      'pl-point-isabel',
      'pl-windy-hill',
    ])
  })

  test('events are stored with sanitized properties, newest first', async () => {
    const c = createLocalClient()
    await c.logEvent('place_viewed', 'pl-point-isabel', { slug: 'a'.repeat(500) })
    await c.logEvent('filter_used', null, { filter: 'water' })
    const events = await c.listEvents()
    expect(events.map((e) => e.event_name)).toEqual(['filter_used', 'place_viewed'])
    expect(String(events[1]?.properties.slug).length).toBe(100)
    await c.clearEvents()
    expect(await c.listEvents()).toEqual([])
  })

  test('sanitizeProperties caps keys and values', () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]))
    expect(Object.keys(sanitizeProperties(many))).toHaveLength(12)
  })
})
