import { createLocalClient } from '@/data/localClient.ts'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  durationBucket,
  filterPlaces,
  parseFilters,
  serializeFilters,
  sortPlaces,
} from './filters.ts'
import { getDisplayRule } from './dogStatus.ts'

const TODAY = '2026-11-08'
const places = await createLocalClient().listPlaces()

describe('filters', () => {
  test('no filters returns everything', () => {
    expect(filterPlaces(places, EMPTY_FILTERS, TODAY)).toHaveLength(places.length)
  })

  test('rule filter uses display state: unverified places only match "unverified"', () => {
    const offLeash = filterPlaces(
      places,
      { ...EMPTY_FILTERS, rules: ['off_leash_ok'] },
      TODAY,
    )
    expect(offLeash.length).toBeGreaterThan(0)
    for (const p of offLeash) expect(getDisplayRule(p, TODAY).state).toBe('off_leash_ok')

    const unverified = filterPlaces(
      places,
      { ...EMPTY_FILTERS, rules: ['unverified'] },
      TODAY,
    )
    expect(unverified.every((p) => p.verification_status === 'needs_verification')).toBe(
      true,
    )
  })

  test('stale places drop out of rule filters and into unverified', () => {
    const farFuture = '2028-01-01'
    expect(
      filterPlaces(places, { ...EMPTY_FILTERS, rules: ['off_leash_ok'] }, farFuture),
    ).toHaveLength(0)
    expect(
      filterPlaces(places, { ...EMPTY_FILTERS, rules: ['unverified'] }, farFuture),
    ).toHaveLength(places.length)
  })

  test('area, water, shade and duration', () => {
    const northBay = filterPlaces(
      places,
      { ...EMPTY_FILTERS, areas: ['north_bay'] },
      TODAY,
    )
    expect(northBay.every((p) => p.region === 'north_bay')).toBe(true)
    const water = filterPlaces(places, { ...EMPTY_FILTERS, water: true }, TODAY)
    expect(
      water.every((p) => p.water_access === 'yes' || p.water_access === 'seasonal'),
    ).toBe(true)
    const shade = filterPlaces(places, { ...EMPTY_FILTERS, shade: true }, TODAY)
    expect(shade.length).toBeGreaterThan(0)
    const short = filterPlaces(places, { ...EMPTY_FILTERS, duration: ['short'] }, TODAY)
    expect(short.every((p) => (p.typical_duration_minutes ?? 999) <= 60)).toBe(true)
  })

  test('search matches name, city and agency', () => {
    expect(filterPlaces(places, { ...EMPTY_FILTERS, q: 'funston' }, TODAY)).toHaveLength(
      1,
    )
    expect(
      filterPlaces(places, { ...EMPTY_FILTERS, q: 'ggnra' }, TODAY).length,
    ).toBeGreaterThan(3)
    expect(filterPlaces(places, { ...EMPTY_FILTERS, q: 'zzzz' }, TODAY)).toHaveLength(0)
  })

  test('duration buckets', () => {
    expect(durationBucket(45)).toBe('short')
    expect(durationBucket(60)).toBe('short')
    expect(durationBucket(90)).toBe('medium')
    expect(durationBucket(150)).toBe('long')
  })

  test('URL round trip ignores junk', () => {
    const f = parseFilters(
      new URLSearchParams('rule=off_leash_ok,bogus&area=north_bay&water=1&dur=nope'),
    )
    expect(f.rules).toEqual(['off_leash_ok'])
    expect(f.areas).toEqual(['north_bay'])
    expect(f.duration).toEqual([])
    expect(serializeFilters(f).toString()).toBe(
      'rule=off_leash_ok&area=north_bay&water=1',
    )
    expect(activeFilterCount(f)).toBe(3)
  })

  test('sort puts unverified places last', () => {
    const sorted = sortPlaces(places, TODAY)
    const firstUnverified = sorted.findIndex(
      (p) => getDisplayRule(p, TODAY).state === 'unverified',
    )
    expect(
      sorted
        .slice(firstUnverified)
        .every((p) => getDisplayRule(p, TODAY).state === 'unverified'),
    ).toBe(true)
  })
})
