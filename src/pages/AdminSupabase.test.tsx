import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/auth/context.ts'
import { authValue } from '@/test/auth.ts'
import Admin from './Admin.tsx'

// Pretend the backend is configured, but keep the local data client for the panel contents.
vi.mock('@/data/index.ts', async () => {
  const { createLocalClient } = await import('@/data/localClient.ts')
  return { dataClient: createLocalClient(), backend: 'supabase' }
})

const renderAdmin = (value: AuthContextValue) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

test('waits for the admin check before deciding', () => {
  renderAdmin(authValue({ status: 'signed_in', email: 'a@b.co', adminChecked: false }))
  expect(screen.getByText('Loading…')).toBeInTheDocument()
  expect(screen.queryByRole('tab', { name: 'Reports' })).toBeNull()
})

test('a signed-in non-admin is turned away', () => {
  renderAdmin(
    authValue({ status: 'signed_in', email: 'visitor@example.com', isAdmin: false }),
  )
  expect(screen.getByRole('alert')).toHaveTextContent(/visitor@example.com.*not an admin/)
  expect(screen.queryByRole('tab', { name: 'Reports' })).toBeNull()
})

test('an admin sees the panel and can sign out', async () => {
  const user = userEvent.setup()
  const value = authValue({
    status: 'signed_in',
    email: 'owner@example.com',
    isAdmin: true,
  })
  renderAdmin(value)
  expect(await screen.findByRole('tab', { name: 'Reports' })).toBeInTheDocument()
  expect(screen.getByText(/saved to your Supabase database/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(value.signOut).toHaveBeenCalled()
})
