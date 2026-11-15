import { beforeEach, describe, expect, test } from 'vitest'
import { createLocalClient } from './localClient.ts'
import {
  DisplayNameSchema,
  NewReviewSchema,
  ReviewGifSchema,
  COMMENT_MAX,
} from './schemas.ts'

beforeEach(() => window.localStorage.clear())

const review = (over = {}) => ({
  place_id: 'pl-point-isabel',
  rating: 4,
  comment: 'Great spot',
  gif: null,
  ...over,
})

describe('review schemas', () => {
  test('rating must be 1 to 5 paws: 0 means unrated and is rejected', () => {
    for (const bad of [0, 6, 2.5, -1]) {
      expect(
        NewReviewSchema.safeParse(review({ rating: bad })).success,
        String(bad),
      ).toBe(false)
    }
    for (const ok of [1, 2, 3, 4, 5]) {
      expect(NewReviewSchema.safeParse(review({ rating: ok })).success).toBe(true)
    }
  })

  test('comment is optional and capped at 500 characters', () => {
    expect(NewReviewSchema.safeParse(review({ comment: null })).success).toBe(true)
    expect(
      NewReviewSchema.safeParse(review({ comment: 'x'.repeat(COMMENT_MAX) })).success,
    ).toBe(true)
    expect(
      NewReviewSchema.safeParse(review({ comment: 'x'.repeat(COMMENT_MAX + 1) })).success,
    ).toBe(false)
  })

  test('display names: 2 to 30 characters and never an email', () => {
    expect(DisplayNameSchema.safeParse('Maya & Biscuit').success).toBe(true)
    expect(DisplayNameSchema.safeParse('M').success).toBe(false)
    expect(DisplayNameSchema.safeParse('x'.repeat(31)).success).toBe(false)
    expect(DisplayNameSchema.safeParse('maya@example.com').success).toBe(false)
    expect(DisplayNameSchema.parse('  Maya  ')).toBe('Maya')
  })

  test('only GIPHY-hosted GIFs are accepted', () => {
    const gif = (url: string) =>
      ReviewGifSchema.safeParse({ id: 'abc', url, title: 'dog' }).success
    expect(gif('https://media2.giphy.com/media/abc/giphy.gif')).toBe(true)
    expect(gif('https://i.giphy.com/abc.gif')).toBe(true)
    expect(gif('https://evil.example/giphy.gif')).toBe(false)
    expect(gif('https://media.giphy.com.evil.example/x.gif')).toBe(false)
    expect(gif('http://media.giphy.com/x.gif')).toBe(false)
  })
})

describe('local client reviews', () => {
  test('a review needs a display name first', async () => {
    const c = createLocalClient()
    expect(await c.getMyProfile()).toBeNull()
    await expect(c.saveReview(review())).rejects.toThrow(/display name/i)
  })

  test('createProfile rejects an email as a name', async () => {
    const r = await createLocalClient().createProfile('me@example.com')
    expect(r.kind).toBe('invalid')
  })

  test('saves one review per place and edits it instead of adding another', async () => {
    const c = createLocalClient()
    await c.createProfile('Maya')
    const first = await c.saveReview(review())
    const second = await c.saveReview(review({ rating: 2, comment: 'Muddy today' }))
    expect(second.id).toBe(first.id)
    const list = await c.listReviews('pl-point-isabel')
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      rating: 2,
      comment: 'Muddy today',
      display_name: 'Maya',
    })
  })

  test('reviews are per place and can be deleted', async () => {
    const c = createLocalClient()
    await c.createProfile('Maya')
    await c.saveReview(review())
    await c.saveReview(review({ place_id: 'pl-tilden' }))
    expect(await c.listReviews('pl-tilden')).toHaveLength(1)
    await c.deleteMyReview('pl-tilden')
    expect(await c.listReviews('pl-tilden')).toHaveLength(0)
    expect(await c.listReviews('pl-point-isabel')).toHaveLength(1)
  })

  test('a hidden review stays visible to its author and in the admin list', async () => {
    const c = createLocalClient()
    await c.createProfile('Maya')
    const saved = await c.saveReview(review())
    await c.setReviewHidden(saved.id, true)
    const mine = await c.listReviews('pl-point-isabel')
    expect(mine[0]?.hidden).toBe(true)
    expect(await c.listAllReviews()).toHaveLength(1)
    // Editing does not un-hide it.
    const edited = await c.saveReview(review({ rating: 5 }))
    expect(edited.hidden).toBe(true)
    await c.setReviewHidden(saved.id, false)
    expect((await c.listReviews('pl-point-isabel'))[0]?.hidden).toBe(false)
  })
})
