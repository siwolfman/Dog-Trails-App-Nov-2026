import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach } from 'vitest'
import { dataClient } from '@/data/index.ts'
import Sunday from './Sunday.tsx'

beforeEach(() => window.localStorage.clear())

const renderPage = () =>
  render(
    <MemoryRouter>
      <Sunday />
    </MemoryRouter>,
  )

test('shows the seeded picks in order with status and stamp', async () => {
  renderPage()
  const items = await screen.findAllByRole('listitem')
  expect(items.length).toBeGreaterThanOrEqual(3)
  expect(items.length).toBeLessThanOrEqual(5)
  expect(
    within(items[0]!).getByRole('heading', { name: /Point Isabel/ }),
  ).toBeInTheDocument()
  expect(within(items[0]!).getByText('Off-leash OK')).toBeInTheDocument()
  expect(within(items[0]!).getByText(/Verified Nov 7, 2026/)).toBeInTheDocument()
})

test('shows picks edited through the data client', async () => {
  const { weekStart } = await dataClient.getSundayPicks()
  await dataClient.saveSundayPicks(weekStart!, [
    { place_id: 'pl-windy-hill', note: 'Hills' },
    { place_id: 'pl-lands-end', note: 'Coast' },
    { place_id: 'pl-muir-beach', note: 'Beach' },
  ])
  renderPage()
  const items = await screen.findAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(
    within(items[0]!).getByRole('heading', { name: /Windy Hill/ }),
  ).toBeInTheDocument()
  expect(within(items[0]!).getByText('Leash required')).toBeInTheDocument()
})

test('an unverified pick still shows as unverified, never a rule', async () => {
  const { weekStart } = await dataClient.getSundayPicks()
  await dataClient.saveSundayPicks(weekStart!, [
    { place_id: 'pl-lake-sonoma-recreation-area', note: '' },
    { place_id: 'pl-lands-end', note: '' },
    { place_id: 'pl-muir-beach', note: '' },
  ])
  renderPage()
  const items = await screen.findAllByRole('listitem')
  expect(within(items[0]!).getByText('Unverified')).toBeInTheDocument()
  expect(within(items[0]!).queryByText(/leash/i)).toBeNull()
})

test('empty state', async () => {
  const { weekStart } = await dataClient.getSundayPicks()
  await dataClient.saveSundayPicks(weekStart!, [])
  renderPage()
  expect(await screen.findByText(/No picks yet/)).toBeInTheDocument()
})
