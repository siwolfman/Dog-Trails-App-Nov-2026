import type { Place } from '@/data/schemas.ts'
import {
  RECHECK_GRACE_DAYS,
  STATUS_META,
  addDays,
  freshnessLabel,
  getDisplayRule,
  getFreshness,
} from './dogStatus.ts'

const verified = {
  verification_status: 'verified',
  dog_status: 'off_leash_ok',
  rule_summary: 'Dogs may be off leash.',
  off_leash_notes: 'Carry a leash.',
  verified_on: '2026-11-07',
  recheck_days: 90,
} satisfies Pick<
  Place,
  | 'verification_status'
  | 'dog_status'
  | 'rule_summary'
  | 'off_leash_notes'
  | 'verified_on'
  | 'recheck_days'
>

describe('getDisplayRule', () => {
  test('a fresh verified place shows its rule', () => {
    const r = getDisplayRule(verified, '2026-11-08')
    expect(r.state).toBe('off_leash_ok')
    expect(r.summary).toBe('Dogs may be off leash.')
    expect(r.offLeashNotes).toBe('Carry a leash.')
    expect(r.reason).toBeNull()
    expect(r.freshness.kind).toBe('fresh')
  })

  test.each(['no_dogs', 'leash_required', 'off_leash_zones', 'off_leash_ok'] as const)(
    'maps %s to its own display state',
    (dog_status) => {
      expect(getDisplayRule({ ...verified, dog_status }, '2026-11-08').state).toBe(
        dog_status,
      )
    },
  )

  describe('unverified places never render a confident rule', () => {
    test('needs_verification, even if rule fields leak in', () => {
      const r = getDisplayRule(
        { ...verified, verification_status: 'needs_verification' },
        '2026-11-08',
      )
      expect(r.state).toBe('unverified')
      expect(r.summary).toBeNull()
      expect(r.offLeashNotes).toBeNull()
      expect(r.reason).toBe('needs_verification')
    })

    test('verified but missing dog_status', () => {
      const r = getDisplayRule({ ...verified, dog_status: null }, '2026-11-08')
      expect(r.state).toBe('unverified')
      expect(r.summary).toBeNull()
      expect(r.reason).toBe('missing_data')
    })

    test('verified but missing summary or date', () => {
      expect(
        getDisplayRule({ ...verified, rule_summary: null }, '2026-11-08').state,
      ).toBe('unverified')
      expect(getDisplayRule({ ...verified, verified_on: null }, '2026-11-08').state).toBe(
        'unverified',
      )
    })

    test('stale rules fall back to unverified on their own', () => {
      const staleDay = addDays('2026-11-07', 90 + RECHECK_GRACE_DAYS + 1)
      const r = getDisplayRule(verified, staleDay)
      expect(r.state).toBe('unverified')
      expect(r.summary).toBeNull()
      expect(r.offLeashNotes).toBeNull()
      expect(r.reason).toBe('stale')
    })
  })

  test('a rule due for recheck is still shown but flagged', () => {
    const r = getDisplayRule(verified, addDays('2026-11-07', 91))
    expect(r.state).toBe('off_leash_ok')
    expect(r.summary).not.toBeNull()
    expect(r.freshness.kind).toBe('recheck_due')
  })
})

describe('getFreshness', () => {
  test('boundaries', () => {
    const due = addDays('2026-11-07', 90)
    expect(getFreshness('2026-11-07', 90, due).kind).toBe('fresh')
    expect(getFreshness('2026-11-07', 90, addDays(due, 1)).kind).toBe('recheck_due')
    expect(getFreshness('2026-11-07', 90, addDays(due, RECHECK_GRACE_DAYS)).kind).toBe(
      'recheck_due',
    )
    expect(
      getFreshness('2026-11-07', 90, addDays(due, RECHECK_GRACE_DAYS + 1)).kind,
    ).toBe('stale')
  })

  test('no verified date', () => {
    expect(getFreshness(null, 90, '2026-11-07').kind).toBe('none')
  })

  test('labels', () => {
    expect(freshnessLabel(getFreshness('2026-11-07', 90, '2026-11-07'))).toBe(
      'Verified Nov 7, 2026',
    )
    expect(freshnessLabel(getFreshness('2026-11-07', 90, '2027-02-10'))).toMatch(
      /^Recheck due /,
    )
    expect(freshnessLabel({ kind: 'none' })).toBe('Not yet verified')
  })
})

describe('addDays', () => {
  test('crosses month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-11-07', 90)).toBe('2027-02-05')
  })
})

test('every state has a label and verdict', () => {
  for (const meta of Object.values(STATUS_META)) {
    expect(meta.label.length).toBeGreaterThan(0)
    expect(meta.verdict.length).toBeGreaterThan(0)
  }
})
