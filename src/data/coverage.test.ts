import { describe, expect, test } from 'vitest'
import seedJson from '@data/places.seed.json'
import { REGIONS, SeedFileSchema } from './schemas.ts'

const seed = SeedFileSchema.parse(seedJson)
const bySlug = new Map(seed.places.map((p) => [p.slug, p]))

describe('coverage area', () => {
  test('every region has places', () => {
    for (const r of REGIONS) {
      expect(
        seed.places.some((p) => p.region === r),
        r,
      ).toBe(true)
    }
  })

  test('the four anchor areas are covered', () => {
    // Geyserville, Vacaville, Livermore and Santa Cruz.
    for (const slug of [
      'lake-sonoma-recreation-area',
      'lagoon-valley-regional-park',
      'lake-del-valle',
      'wilder-ranch-state-park',
    ]) {
      expect(bySlug.has(slug), slug).toBe(true)
    }
  })

  test('places are assigned to the region of their county and area', () => {
    const region = (slug: string) => bySlug.get(slug)?.region
    expect(region('riverfront-regional-park')).toBe('north_bay') // Sonoma
    expect(region('lynch-canyon-open-space-park')).toBe('north_bay') // Solano
    expect(region('point-isabel')).toBe('east_bay_north') // Contra Costa
    expect(region('tilden')).toBe('east_bay_central') // northern Alameda
    expect(region('lake-del-valle')).toBe('east_bay_south') // Tri-Valley
    expect(region('wilder-ranch-state-park')).toBe('south_bay') // Santa Cruz
    expect(region('windy-hill')).toBe('south_bay') // Peninsula
  })

  test('the map data stays inside the supported area', () => {
    for (const p of seed.places) {
      expect(p.lat, p.slug).toBeGreaterThan(36.5)
      expect(p.lat, p.slug).toBeLessThan(39.2)
      expect(p.lng, p.slug).toBeGreaterThan(-123.8)
      expect(p.lng, p.slug).toBeLessThan(-121.2)
    }
  })

  test('every verified place has a history row from its source', () => {
    for (const p of seed.places.filter((x) => x.verification_status === 'verified')) {
      const rows = seed.place_rule_history.filter((h) => h.place_id === p.id)
      expect(rows.length, p.slug).toBeGreaterThan(0)
    }
  })
})
