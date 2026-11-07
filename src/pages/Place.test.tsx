import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, vi } from 'vitest'
import PlaceRoute from './Place.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/place/:slug" element={<PlaceRoute />} />
        <Route path="*" element={<p>fallback</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 80, weather_code: 0 },
        daily: { temperature_2m_max: [97], precipitation_probability_max: [0] },
      }),
    })),
  )
})
afterEach(() => vi.unstubAllGlobals())

test('shows the Go/No-Go card, source and a heat warning for a hot day', async () => {
  renderAt('/place/fort-funston')
  expect(await screen.findByRole('heading', { name: 'Fort Funston' })).toBeInTheDocument()
  expect(screen.getByText('Go, with limits.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /GGNRA: dog rules/ })).toBeInTheDocument()
  expect(await screen.findByText(/Very hot, 97°F/)).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(/Heat warning/)
})

test('weather failure degrades gracefully', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new Error('offline'))),
  )
  renderAt('/place/lands-end')
  expect(await screen.findByText('Unavailable')).toBeInTheDocument()
  expect(screen.getByText('Go, with limits.')).toBeInTheDocument()
})

test('unknown slugs show a not-found page', async () => {
  renderAt('/place/nope')
  expect(await screen.findByText('Nothing here.')).toBeInTheDocument()
})
