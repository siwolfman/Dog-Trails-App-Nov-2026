import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, vi } from 'vitest'
import Admin from './Admin.tsx'

type Session = { user: { email: string } } | null
const h = vi.hoisted(() => ({
  session: null as Session,
  isAdmin: false,
  signInError: null as string | null,
  listeners: [] as ((e: string, s: Session) => void)[],
}))

vi.mock('@/data/supabase.ts', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: h.session } }),
      onAuthStateChange: (cb: (e: string, s: Session) => void) => {
        h.listeners.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        if (h.signInError) return { error: { message: h.signInError } }
        h.session = { user: { email } }
        h.listeners.forEach((cb) => cb('SIGNED_IN', h.session))
        return { error: null }
      },
      signOut: async () => {
        h.session = null
      },
    },
    rpc: async (fn: string) => ({ data: fn === 'is_admin' ? h.isAdmin : null }),
  },
}))

// Pretend the backend is configured, but keep the local data client for the panel contents.
vi.mock('@/data/index.ts', async () => {
  const { createLocalClient } = await import('@/data/localClient.ts')
  return { dataClient: createLocalClient(), backend: 'supabase' }
})

beforeEach(() => {
  h.session = null
  h.isAdmin = false
  h.signInError = null
  h.listeners.length = 0
})

const renderAdmin = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>,
  )

test('signed-out visitors see the email and password form, not the panel', async () => {
  renderAdmin()
  expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toBeInTheDocument()
  expect(screen.queryByRole('tab', { name: 'Reports' })).toBeNull()
})

test('shows the sign-in error from Supabase', async () => {
  h.signInError = 'Invalid login credentials'
  const user = userEvent.setup()
  renderAdmin()
  await user.type(await screen.findByLabelText('Email'), 'a@b.co')
  await user.type(screen.getByLabelText('Password'), 'nope')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
})

test('a signed-in non-admin is turned away', async () => {
  h.session = { user: { email: 'visitor@example.com' } }
  h.isAdmin = false
  renderAdmin()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /visitor@example.com.*not an admin/,
  )
  expect(screen.queryByRole('tab', { name: 'Reports' })).toBeNull()
})

test('an admin session shows the panel and can sign out', async () => {
  h.session = { user: { email: 'owner@example.com' } }
  h.isAdmin = true
  const user = userEvent.setup()
  renderAdmin()
  expect(await screen.findByRole('tab', { name: 'Reports' })).toBeInTheDocument()
  expect(screen.getByText(/saved to your Supabase database/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByLabelText('Email')).toBeInTheDocument()
})

test('signing in as an admin reveals the panel', async () => {
  h.isAdmin = true
  const user = userEvent.setup()
  renderAdmin()
  await user.type(await screen.findByLabelText('Email'), 'owner@example.com')
  await user.type(screen.getByLabelText('Password'), 'correct')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('tab', { name: 'Reports' })).toBeInTheDocument()
})
