import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, vi } from 'vitest'
import { dataClient } from '@/data/index.ts'
import Home from '@/pages/Home.tsx'
import PlaceRoute from '@/pages/Place.tsx'
import Sunday from '@/pages/Sunday.tsx'
import { track } from './track.ts'

vi.mock('@/components/PlaceMap.tsx', () => ({ default: () => null }))

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 60, weather_code: 1 },
        daily: { temperature_2m_max: [65], precipitation_probability_max: [0] },
      }),
    })),
  )
})

const names = async () => (await dataClient.listEvents()).map((e) => e.event_name)

test('track stores an event with an in-memory session id and no identifiers', async () => {
  track('place_viewed', 'pl-lands-end', { slug: 'lands-end' })
  track('filter_used', null, { filter: 'water' })
  await waitFor(async () => expect(await dataClient.listEvents()).toHaveLength(2))
  const events = await dataClient.listEvents()
  expect(events[0]?.properties.session).toBe(events[1]?.properties.session)
  expect(String(events[0]?.properties.session)).toHaveLength(8)
  expect(Object.keys(events[0]!)).toEqual(
    expect.arrayContaining(['id', 'event_name', 'place_id', 'properties', 'created_at']),
  )
  expect(JSON.stringify(events)).not.toMatch(/ip|user|email/i)
})

test('place page logs place_viewed and gonogo_opened once, and source clicks', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/place/fort-funston']}>
      <Routes>
        <Route path="/place/:slug" element={<PlaceRoute />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Fort Funston' })
  await waitFor(async () => {
    const n = await names()
    expect(n).toContain('place_viewed')
    expect(n).toContain('gonogo_opened')
  })
  await user.click(screen.getByRole('link', { name: /GGNRA: dog rules/ }))
  await waitFor(async () => expect(await names()).toContain('source_link_clicked'))

  const events = await dataClient.listEvents()
  expect(events.filter((e) => e.event_name === 'place_viewed')).toHaveLength(1)
  expect(events.filter((e) => e.event_name === 'gonogo_opened')).toHaveLength(1)
  const viewed = events.find((e) => e.event_name === 'place_viewed')!
  expect(viewed.place_id).toBe('pl-fort-funston')
  expect(viewed.properties).toMatchObject({
    slug: 'fort-funston',
    state: 'off_leash_zones',
    from: 'direct',
  })
})

test('submitting a report logs report_submitted', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/place/lands-end']}>
      <Routes>
        <Route path="/place/:slug" element={<PlaceRoute />} />
      </Routes>
    </MemoryRouter>,
  )
  await user.click(await screen.findByRole('button', { name: /Report an issue/ }))
  await user.type(screen.getByLabelText(/Tell us what you saw/), 'Sign says leash only')
  await user.click(screen.getByRole('button', { name: 'Send report' }))
  await waitFor(async () => expect(await names()).toContain('report_submitted'))
  const e = (await dataClient.listEvents()).find(
    (x) => x.event_name === 'report_submitted',
  )!
  expect(e.place_id).toBe('pl-lands-end')
  expect(e.properties.type).toBe('wrong_rule')
  // The free-text message is never logged.
  expect(JSON.stringify(e)).not.toMatch(/leash only/)
})

test('using filters logs filter_used, but never the search text', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
  await screen.findByRole('link', { name: /Mount Tamalpais State Park/ })
  await user.click(screen.getByRole('button', { name: 'Off-leash' }))
  await user.type(screen.getByRole('searchbox'), 'funston secret words')
  await waitFor(async () =>
    expect((await dataClient.listEvents()).length).toBeGreaterThanOrEqual(2),
  )
  const events = await dataClient.listEvents()
  expect(events.every((e) => e.event_name === 'filter_used')).toBe(true)
  expect(events.some((e) => e.properties.filter === 'off_leash')).toBe(true)
  expect(events.filter((e) => e.properties.filter === 'search')).toHaveLength(1)
  expect(JSON.stringify(events)).not.toMatch(/funston|secret/)
})

test('the Sunday page logs sunday_viewed', async () => {
  render(
    <MemoryRouter>
      <Sunday />
    </MemoryRouter>,
  )
  await screen.findAllByRole('listitem')
  await waitFor(async () => expect(await names()).toContain('sunday_viewed'))
})
