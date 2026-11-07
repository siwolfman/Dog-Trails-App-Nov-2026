import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import Home from './Home.tsx'

// MapLibre needs WebGL, which jsdom does not have.
vi.mock('@/components/PlaceMap.tsx', () => ({ default: () => <div data-testid="map" /> }))

function renderHome(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Home />
    </MemoryRouter>,
  )
}

test('lists places and labels every row with a status (not color alone)', async () => {
  renderHome()
  const rows = await screen.findAllByRole('link', { name: /Point Isabel/ })
  expect(rows.length).toBeGreaterThan(0)
  expect(within(rows[0]!).getByText('Off-leash OK')).toBeInTheDocument()
})

test('unverified places say so and show no rule text', async () => {
  renderHome()
  const row = (await screen.findByRole('link', { name: /Ring Mountain/ })) as HTMLElement
  expect(within(row).getByText('Unverified')).toBeInTheDocument()
  expect(within(row).getByText(/check agency page/)).toBeInTheDocument()
  expect(within(row).getByText('Not yet verified')).toBeInTheDocument()
  expect(within(row).queryByText(/leash/i)).toBeNull()
})

test('the Off-leash chip filters the list', async () => {
  const user = userEvent.setup()
  renderHome()
  await screen.findByRole('link', { name: /Ring Mountain/ })
  await user.click(screen.getByRole('button', { name: 'Off-leash' }))
  expect(screen.queryByRole('link', { name: /Ring Mountain/ })).toBeNull()
  expect(screen.getByRole('link', { name: /Fort Funston/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Point Isabel/ })).toBeInTheDocument()
})

test('filters come from the URL, and an empty result offers a way out', async () => {
  renderHome('/?q=zzzz')
  expect(await screen.findByText('No places match.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
})
