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

  test('Marin and Napa are covered (batch 2)', () => {
    for (const slug of [
      'mount-burdell',
      'point-reyes-national-seashore',
      'mount-tamalpais-watershed',
      'rodeo-beach',
      'oat-hill-mine-trail',
      'skyline-wilderness-park',
    ]) {
      expect(bySlug.has(slug), slug).toBe(true)
    }
    // Ring Mountain was Unverified until the county's own preserve page could be read.
    expect(bySlug.get('ring-mountain')?.dog_status).toBe('leash_required')
  })

  test('the rest of the East Bay is covered (batch 3)', () => {
    const region = (slug: string) => bySlug.get(slug)?.region
    expect(region('wildcat-canyon-regional-park')).toBe('east_bay_north')
    expect(region('anthony-chabot-regional-park')).toBe('east_bay_central')
    expect(region('don-edwards-san-francisco-bay-nwr')).toBe('east_bay_south')
    // Brushy Peak's own page is stricter than the district-wide rule.
    expect(bySlug.get('brushy-peak')?.dog_status).toBe('leash_required')
    expect(bySlug.get('tilden-nature-area')?.dog_status).toBe('no_dogs')
  })

  test('the Peninsula is covered (batch 4)', () => {
    const region = (slug: string) => bySlug.get(slug)?.region
    expect(region('coyote-point-recreation-area')).toBe('south_bay')
    expect(region('thornewood')).toBe('south_bay')
    // Midpen's own preserve pages decide these.
    expect(bySlug.get('purisima-creek-redwoods')?.dog_status).toBe('no_dogs')
    expect(bySlug.get('el-sereno')?.dog_status).toBe('leash_required')
    expect(bySlug.get('pillar-point-bluff')?.verification_status).toBe('verified')
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
