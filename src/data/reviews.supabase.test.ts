import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, test } from 'vitest'
import { createSupabaseDataClient } from './supabaseClient.ts'

type Result = { data?: unknown; error?: { message: string; code?: string } | null }
type Call = [string, ...unknown[]]

/** Chainable, awaitable fake of the supabase-js query builder with per-table results. */
function fake(
  results: Record<string, Result | Result[]> = {},
  userId: string | null = 'user-1',
) {
  const calls: Call[] = []
  const builder = (key: string) => {
    const q: unknown = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            const entry = results[key] ?? { data: null, error: null }
            // An array is a queue: each await takes the next result (the last one repeats).
            const r = Array.isArray(entry)
              ? entry.length > 1
                ? entry.shift()!
                : entry[0]!
              : entry
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
    from: (t: string) => builder(t),
    rpc: (fn: string, args: unknown) => {
      calls.push([`rpc.${fn}`, args])
      return builder(`rpc.${fn}`)
    },
    auth: {
      getSession: async () => ({
        data: { session: userId ? { user: { id: userId } } : null },
      }),
    },
  } as unknown as SupabaseClient
  return { sb, calls }
}

const reviewRow = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  place_id: 'p1',
  user_id: 'user-1',
  rating: 5,
  comment: 'Lovely',
  gif: null,
  hidden: false,
  created_at: '2026-11-15T10:00:00+00:00',
  updated_at: '2026-11-15T10:00:00+00:00',
  profiles: { display_name: 'Maya' },
  ...over,
})

describe('supabase profiles', () => {
  test('creates a profile with the validated name', async () => {
    const { sb, calls } = fake()
    const r = await createSupabaseDataClient(sb).createProfile('  Maya  ')
    expect(r).toEqual({
      kind: 'ok',
      profile: { user_id: 'user-1', display_name: 'Maya' },
    })
    expect(calls).toContainEqual([
      'profiles.insert',
      { user_id: 'user-1', display_name: 'Maya' },
    ])
  })

  test('an email-like name never reaches the database', async () => {
    const { sb, calls } = fake()
    const r = await createSupabaseDataClient(sb).createProfile('me@example.com')
    expect(r.kind).toBe('invalid')
    expect(calls.some(([c]) => c === 'profiles.insert')).toBe(false)
  })

  test('a unique-violation means the name is taken', async () => {
    const { sb } = fake({ profiles: { error: { message: 'duplicate', code: '23505' } } })
    expect(await createSupabaseDataClient(sb).createProfile('Maya')).toEqual({
      kind: 'taken',
    })
  })

  test('getMyProfile is null when signed out', async () => {
    const { sb } = fake({}, null)
    expect(await createSupabaseDataClient(sb).getMyProfile()).toBeNull()
  })
})

describe('supabase reviews', () => {
  test('listReviews flattens the joined display name and never asks for email', async () => {
    const { sb, calls } = fake({ reviews: { data: [reviewRow()] } })
    const list = await createSupabaseDataClient(sb).listReviews('p1')
    expect(list[0]).toMatchObject({ display_name: 'Maya', rating: 5 })
    expect(list[0]).not.toHaveProperty('profiles')
    const select = calls.find(([c]) => c === 'reviews.select')!
    expect(String(select[1])).toContain('profiles(display_name)')
    expect(String(select[1])).not.toContain('email')
  })

  test('a row with no display name is skipped rather than shown', async () => {
    const { sb } = fake({ reviews: { data: [reviewRow({ profiles: null })] } })
    const spy = console.error
    console.error = () => {}
    const list = await createSupabaseDataClient(sb).listReviews('p1')
    console.error = spy
    expect(list).toEqual([])
  })

  test('saveReview inserts when the person has no review for this place yet', async () => {
    // 1st await: the lookup finds nothing. 2nd await: the insert returns the saved row.
    const { sb, calls } = fake({ reviews: [{ data: null }, { data: reviewRow() }] })
    const saved = await createSupabaseDataClient(sb).saveReview({
      place_id: 'p1',
      rating: 5,
      comment: ' Lovely ',
      gif: null,
    })
    expect(saved).toMatchObject({ display_name: 'Maya', rating: 5 })
    expect(calls).toContainEqual([
      'reviews.insert',
      { place_id: 'p1', rating: 5, comment: 'Lovely', gif: null },
    ])
    expect(calls.some(([c]) => c === 'reviews.update' || c === 'reviews.upsert')).toBe(
      false,
    )
  })

  test('saveReview updates only the review content when one already exists', async () => {
    const { sb, calls } = fake({
      reviews: [{ data: { id: 'r1' } }, { data: reviewRow({ rating: 2 }) }],
    })
    await createSupabaseDataClient(sb).saveReview({
      place_id: 'p1',
      rating: 2,
      comment: null,
      gif: null,
    })
    expect(calls).toContainEqual([
      'reviews.update',
      { rating: 2, comment: null, gif: null },
    ])
    expect(calls.some(([c]) => c === 'reviews.insert' || c === 'reviews.upsert')).toBe(
      false,
    )
  })

  test('saveReview rejects an invalid rating before touching the database', async () => {
    const { sb, calls } = fake()
    await expect(
      createSupabaseDataClient(sb).saveReview({
        place_id: 'p1',
        rating: 0,
        comment: null,
        gif: null,
      }),
    ).rejects.toThrow()
    expect(calls).toHaveLength(0)
  })

  test('hiding a review goes through the admin-only function', async () => {
    const { sb, calls } = fake()
    await createSupabaseDataClient(sb).setReviewHidden('r1', true)
    expect(calls).toContainEqual([
      'rpc.set_review_hidden',
      { p_id: 'r1', p_hidden: true },
    ])
  })
})
