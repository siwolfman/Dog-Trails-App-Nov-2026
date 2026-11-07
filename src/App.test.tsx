import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from './App.tsx'

test('renders the app shell', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: /Pawprint/ })).toBeInTheDocument()
})

vi.mock('@/components/PlaceMap.tsx', () => ({ default: () => null }))
