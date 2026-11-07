import type { DogStatus, Place } from '@/data/schemas.ts'

/** What the UI shows. `unverified` is derived, never stored on a place. */
export type DisplayState = DogStatus | 'unverified'

export const DISPLAY_STATES: readonly DisplayState[] = [
  'off_leash_ok',
  'off_leash_zones',
  'leash_required',
  'no_dogs',
  'unverified',
]

export interface StatusMeta {
  state: DisplayState
  /** Short label, always shown next to the icon. */
  label: string
  /** Glanceable Go/No-Go headline. */
  verdict: string
  /** One-line plain-language explanation of the state itself. */
  blurb: string
}

export const STATUS_META: Record<DisplayState, StatusMeta> = {
  off_leash_ok: {
    state: 'off_leash_ok',
    label: 'Off-leash OK',
    verdict: 'Go.',
    blurb: 'Dogs can be off leash across the park, with conditions on the card.',
  },
  off_leash_zones: {
    state: 'off_leash_zones',
    label: 'Off-leash zones',
    verdict: 'Go, with limits.',
    blurb: 'Off leash only in marked areas, leash everywhere else.',
  },
  leash_required: {
    state: 'leash_required',
    label: 'Leash required',
    verdict: 'Go, on leash.',
    blurb: 'Dogs are welcome on a leash.',
  },
  no_dogs: {
    state: 'no_dogs',
    label: 'No dogs',
    verdict: 'No-go.',
    blurb: 'The agency does not allow dogs.',
  },
  unverified: {
    state: 'unverified',
    label: 'Unverified',
    verdict: 'Check first.',
    blurb: 'We could not confirm the rule from an official source.',
  },
}

/** Days after the recheck date during which a rule is still shown but flagged. */
export const RECHECK_GRACE_DAYS = 30

export type Freshness =
  | { kind: 'fresh'; verifiedOn: string; recheckOn: string }
  | { kind: 'recheck_due'; verifiedOn: string; recheckOn: string }
  | { kind: 'stale'; verifiedOn: string; recheckOn: string }
  | { kind: 'none' }

export type UnverifiedReason = 'needs_verification' | 'stale' | 'missing_data'

export interface DisplayRule {
  state: DisplayState
  /** Null whenever state is `unverified`. A confident rule never leaks through. */
  summary: string | null
  offLeashNotes: string | null
  freshness: Freshness
  /** Set only when state is `unverified`. */
  reason: UnverifiedReason | null
}

const DAY_MS = 86_400_000

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / DAY_MS)
}

function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days)
}

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getFreshness(
  verifiedOn: string | null,
  recheckDays: number,
  today: string,
): Freshness {
  if (!verifiedOn) return { kind: 'none' }
  const recheckOn = addDays(verifiedOn, recheckDays)
  const t = dayNumber(today)
  const due = dayNumber(recheckOn)
  if (t <= due) return { kind: 'fresh', verifiedOn, recheckOn }
  if (t <= due + RECHECK_GRACE_DAYS) return { kind: 'recheck_due', verifiedOn, recheckOn }
  return { kind: 'stale', verifiedOn, recheckOn }
}

type RuleInput = Pick<
  Place,
  | 'verification_status'
  | 'dog_status'
  | 'rule_summary'
  | 'off_leash_notes'
  | 'verified_on'
  | 'recheck_days'
>

/**
 * The single gate every component must use to show a dog rule.
 * Unverified, stale or incomplete places NEVER return a confident rule.
 */
export function getDisplayRule(
  place: RuleInput,
  today: string = todayISO(),
): DisplayRule {
  const freshness = getFreshness(place.verified_on, place.recheck_days, today)
  const unverified = (reason: UnverifiedReason): DisplayRule => ({
    state: 'unverified',
    summary: null,
    offLeashNotes: null,
    freshness,
    reason,
  })

  if (place.verification_status !== 'verified') return unverified('needs_verification')
  if (!place.dog_status || !place.rule_summary || freshness.kind === 'none') {
    return unverified('missing_data')
  }
  if (freshness.kind === 'stale') return unverified('stale')

  return {
    state: place.dog_status,
    summary: place.rule_summary,
    offLeashNotes: place.off_leash_notes,
    freshness,
    reason: null,
  }
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function freshnessLabel(f: Freshness): string {
  switch (f.kind) {
    case 'fresh':
      return `Verified ${formatDate(f.verifiedOn)}`
    case 'recheck_due':
      return `Recheck due ${formatDate(f.recheckOn)}`
    case 'stale':
      return 'Stale, treat as unverified'
    case 'none':
      return 'Not yet verified'
  }
}
