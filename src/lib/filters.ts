import type { Place, Region } from '@/data/schemas.ts'
import { REGIONS } from '@/data/schemas.ts'
import { DISPLAY_STATES, getDisplayRule, type DisplayState } from './dogStatus.ts'
import { agencyShort, REGION_LABELS } from './labels.ts'

export const DURATION_BUCKETS = ['short', 'medium', 'long'] as const
export type DurationBucket = (typeof DURATION_BUCKETS)[number]

export const DURATION_LABELS: Record<DurationBucket, string> = {
  short: 'Under 1 hr',
  medium: '1 to 2 hrs',
  long: '2+ hrs',
}

export interface Filters {
  q: string
  rules: DisplayState[]
  duration: DurationBucket[]
  areas: Region[]
  water: boolean
  shade: boolean
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  rules: [],
  duration: [],
  areas: [],
  water: false,
  shade: false,
}

export function durationBucket(minutes: number): DurationBucket {
  if (minutes <= 60) return 'short'
  if (minutes <= 120) return 'medium'
  return 'long'
}

const list = <T extends string>(v: string | null, allowed: readonly T[]): T[] =>
  (v ?? '').split(',').filter((x): x is T => (allowed as readonly string[]).includes(x))

export function parseFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    rules: list(params.get('rule'), DISPLAY_STATES),
    duration: list(params.get('dur'), DURATION_BUCKETS),
    areas: list(params.get('area'), REGIONS),
    water: params.get('water') === '1',
    shade: params.get('shade') === '1',
  }
}

export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.rules.length) p.set('rule', f.rules.join(','))
  if (f.duration.length) p.set('dur', f.duration.join(','))
  if (f.areas.length) p.set('area', f.areas.join(','))
  if (f.water) p.set('water', '1')
  if (f.shade) p.set('shade', '1')
  return p
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.rules.length ? 1 : 0) +
    (f.duration.length ? 1 : 0) +
    (f.areas.length ? 1 : 0) +
    (f.water ? 1 : 0) +
    (f.shade ? 1 : 0)
  )
}

/** Filtering uses the DISPLAY state, so stale or unverified places never match a rule filter. */
export function filterPlaces(places: Place[], f: Filters, today: string): Place[] {
  const q = f.q.trim().toLowerCase()
  return places.filter((p) => {
    if (q) {
      const hay =
        `${p.name} ${p.city} ${p.agency} ${agencyShort(p.agency)} ${REGION_LABELS[p.region]}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (f.rules.length && !f.rules.includes(getDisplayRule(p, today).state)) return false
    if (f.duration.length) {
      if (p.typical_duration_minutes === null) return false
      if (!f.duration.includes(durationBucket(p.typical_duration_minutes))) return false
    }
    if (f.areas.length && !f.areas.includes(p.region)) return false
    if (f.water && !(p.water_access === 'yes' || p.water_access === 'seasonal'))
      return false
    if (f.shade && !(p.shade_level === 'some' || p.shade_level === 'lots')) return false
    return true
  })
}

const ORDER: Record<DisplayState, number> = {
  off_leash_ok: 0,
  off_leash_zones: 1,
  leash_required: 2,
  no_dogs: 3,
  unverified: 4,
}

/** Sort: best answers first, unverified last, then by name. */
export function sortPlaces(places: Place[], today: string): Place[] {
  return [...places].sort(
    (a, b) =>
      ORDER[getDisplayRule(a, today).state] - ORDER[getDisplayRule(b, today).state] ||
      a.name.localeCompare(b.name),
  )
}
