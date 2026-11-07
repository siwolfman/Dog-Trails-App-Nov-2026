import { createLocalClient } from '@/data/localClient.ts'
import type { AppEvent } from '@/data/schemas.ts'
import { checkAdminPassword, countByName, eventsToCSV, validatePicks } from './admin.ts'
import { mondayOf, sundayOf, weekForNextSunday } from './weeks.ts'

const places = await createLocalClient().listPlaces()
const TODAY = '2026-11-08'
const id = (slug: string) => places.find((p) => p.slug === slug)!.id
const pick = (slug: string) => ({ place_id: id(slug), note: '' })

describe('validatePicks', () => {
  const ok = [pick('point-isabel'), pick('fort-funston'), pick('lands-end')]

  test('accepts 3 verified places', () => {
    expect(validatePicks(ok, places, TODAY)).toEqual([])
  })
  test('requires 3 to 5', () => {
    expect(validatePicks(ok.slice(0, 2), places, TODAY)[0]).toMatch(/3 to 5/)
    const six = [...ok, pick('tilden'), pick('briones'), pick('sibley')]
    expect(validatePicks(six, places, TODAY)[0]).toMatch(/3 to 5/)
  })
  test('rejects duplicates and unverified places', () => {
    expect(validatePicks([...ok, pick('lands-end')], places, TODAY).join()).toMatch(
      /only once/,
    )
    expect(validatePicks([...ok, pick('ring-mountain')], places, TODAY).join()).toMatch(
      /unverified/,
    )
  })
  test('rejects overlong notes', () => {
    const long = [{ ...ok[0]!, note: 'x'.repeat(281) }, ok[1]!, ok[2]!]
    expect(validatePicks(long, places, TODAY).join()).toMatch(/280/)
  })
})

describe('weeks', () => {
  test('mondayOf', () => {
    expect(mondayOf('2026-11-08')).toBe('2026-11-02') // Sunday
    expect(mondayOf('2026-11-09')).toBe('2026-11-09') // Monday
    expect(mondayOf('2026-11-07')).toBe('2026-11-02') // Saturday
  })
  test('weekForNextSunday', () => {
    expect(weekForNextSunday('2026-11-07')).toBe('2026-11-02') // Sat -> tomorrow
    expect(weekForNextSunday('2026-11-08')).toBe('2026-11-02') // Sunday itself
    expect(weekForNextSunday('2026-11-09')).toBe('2026-11-09') // Monday -> this week's Sunday
  })
  test('sundayOf', () => expect(sundayOf('2026-11-09')).toBe('2026-11-15'))
})

describe('events export', () => {
  const events: AppEvent[] = [
    {
      id: 'a',
      event_name: 'place_viewed',
      place_id: 'pl-x',
      properties: { slug: 'x' },
      created_at: '2026-11-08T00:00:00.000Z',
    },
    {
      id: 'b',
      event_name: 'filter_used',
      place_id: null,
      properties: { note: 'a,"b"' },
      created_at: '2026-11-08T00:01:00.000Z',
    },
  ]
  test('CSV escapes cells', () => {
    const csv = eventsToCSV(events)
    expect(csv.split('\n')[0]).toBe('id,created_at,event_name,place_id,properties')
    expect(csv).toContain('"{""note"":""a,\\""b\\""""}"')
  })
  test('counts', () =>
    expect(countByName(events)).toEqual({ place_viewed: 1, filter_used: 1 }))
})

describe('admin gate', () => {
  test('matches only the exact password and fails closed when unset', () => {
    expect(checkAdminPassword('secret', 'secret')).toBe(true)
    expect(checkAdminPassword('secreT', 'secret')).toBe(false)
    expect(checkAdminPassword('secre', 'secret')).toBe(false)
    expect(checkAdminPassword('', '')).toBe(false)
    expect(checkAdminPassword('x', undefined)).toBe(false)
  })
})
