import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'
import AuthProvider from './AuthProvider.tsx'
import { useAuth } from './useAuth.ts'

type Session = { user: { email: string } } | null
const h = vi.hoisted(() => ({
  session: null as Session,
  isAdmin: false,
  signInError: null as { message: string } | null,
  signUpResult: {
    data: { session: null as Session },
    error: null as { message: string } | null,
  },
  signUpArgs: null as unknown,
  resetArgs: null as unknown,
  resetError: null as { message: string } | null,
  updateArgs: null as unknown,
  updateError: null as { message: string } | null,
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
        if (h.signInError) return { error: h.signInError }
        h.session = { user: { email } }
        h.listeners.forEach((cb) => cb('SIGNED_IN', h.session))
        return { error: null }
      },
      signUp: async (args: unknown) => {
        h.signUpArgs = args
        return h.signUpResult
      },
      resetPasswordForEmail: async (email: string, opts: unknown) => {
        h.resetArgs = { email, opts }
        return { error: h.resetError }
      },
      updateUser: async (args: unknown) => {
        h.updateArgs = args
        return { error: h.updateError }
      },
      signOut: async () => {
        h.session = null
      },
    },
    rpc: async (fn: string) => ({ data: fn === 'is_admin' ? h.isAdmin : null }),
  },
}))

beforeEach(() => {
  h.session = null
  h.isAdmin = false
  h.signInError = null
  h.signUpResult = { data: { session: null }, error: null }
  h.signUpArgs = null
  h.resetArgs = null
  h.resetError = null
  h.updateArgs = null
  h.updateError = null
  h.listeners.length = 0
})

function Probe() {
  const a = useAuth()
  return (
    <div>
      <p data-testid="state">
        {a.enabled ? 'enabled' : 'local'}|{a.status}|{a.email ?? '-'}|admin:
        {String(a.isAdmin)}|checked:
        {String(a.adminChecked)}
      </p>
      <button onClick={async () => alert(await a.signIn('a@b.co', 'password1'))}>
        signin
      </button>
      <button
        onClick={async () => alert(JSON.stringify(await a.signUp('a@b.co', 'password1')))}
      >
        signup
      </button>
      <button onClick={() => void a.signOut()}>signout</button>
      <button onClick={async () => alert(String(await a.requestPasswordReset('a@b.co')))}>
        reset
      </button>
      <button
        onClick={async () => alert(String(await a.updatePassword('new password 1')))}
      >
        update
      </button>
    </div>
  )
}

const setup = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
const state = () => screen.getByTestId('state').textContent

test('starts loading, then signed out with no session', async () => {
  setup()
  expect(state()).toContain('loading')
  await waitFor(() => expect(state()).toContain('signed_out'))
  expect(state()).toContain('enabled')
})

test('restores an existing session and checks admin', async () => {
  h.session = { user: { email: 'me@example.com' } }
  h.isAdmin = true
  setup()
  await waitFor(() =>
    expect(state()).toBe('enabled|signed_in|me@example.com|admin:true|checked:true'),
  )
})

test('a normal signed-in user is not an admin', async () => {
  h.session = { user: { email: 'me@example.com' } }
  setup()
  await waitFor(() => expect(state()).toContain('admin:false|checked:true'))
})

test('signIn success signs the user in; failure returns a friendly message', async () => {
  const user = userEvent.setup()
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  setup()
  await waitFor(() => expect(state()).toContain('signed_out'))

  h.signInError = { message: 'Invalid login credentials' }
  await user.click(screen.getByText('signin'))
  await waitFor(() =>
    expect(alertSpy).toHaveBeenLastCalledWith('That email and password do not match.'),
  )
  expect(state()).toContain('signed_out')

  h.signInError = null
  await user.click(screen.getByText('signin'))
  await waitFor(() => expect(state()).toContain('signed_in|a@b.co'))
  alertSpy.mockRestore()
})

test('signUp: session returned means signed in, none means confirm your email', async () => {
  const user = userEvent.setup()
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  setup()
  await waitFor(() => expect(state()).toContain('signed_out'))

  h.signUpResult = { data: { session: { user: { email: 'a@b.co' } } }, error: null }
  await user.click(screen.getByText('signup'))
  await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('{"kind":"signed_in"}'))
  expect(h.signUpArgs).toMatchObject({ email: 'a@b.co', password: 'password1' })

  h.signUpResult = { data: { session: null }, error: null }
  await user.click(screen.getByText('signup'))
  await waitFor(() =>
    expect(alertSpy).toHaveBeenLastCalledWith('{"kind":"confirm_email"}'),
  )
  alertSpy.mockRestore()
})

test('signUp reports a duplicate account in plain language', async () => {
  const user = userEvent.setup()
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  setup()
  await waitFor(() => expect(state()).toContain('signed_out'))
  h.signUpResult = {
    data: { session: null },
    error: { message: 'User already registered' },
  }
  await user.click(screen.getByText('signup'))
  await waitFor(() =>
    expect(String(alertSpy.mock.lastCall?.[0])).toContain('already exists'),
  )
  alertSpy.mockRestore()
})

test('signOut returns to signed out', async () => {
  h.session = { user: { email: 'me@example.com' } }
  const user = userEvent.setup()
  setup()
  await waitFor(() => expect(state()).toContain('signed_in'))
  await user.click(screen.getByText('signout'))
  await waitFor(() => expect(state()).toContain('signed_out'))
})

test('requestPasswordReset sends the user back to the reset page', async () => {
  const user = userEvent.setup()
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  setup()
  await waitFor(() => expect(state()).toContain('signed_out'))
  await user.click(screen.getByText('reset'))
  await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('null'))
  expect(h.resetArgs).toEqual({
    email: 'a@b.co',
    opts: { redirectTo: `${window.location.origin}/reset-password` },
  })

  h.resetError = { message: 'email rate limit exceeded' }
  await user.click(screen.getByText('reset'))
  await waitFor(() =>
    expect(String(alertSpy.mock.lastCall?.[0])).toContain('Too many attempts'),
  )
  alertSpy.mockRestore()
})

test('updatePassword passes the new password to Supabase and reports errors', async () => {
  const user = userEvent.setup()
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  setup()
  await waitFor(() => expect(state()).toContain('signed_out'))
  await user.click(screen.getByText('update'))
  await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('null'))
  expect(h.updateArgs).toEqual({ password: 'new password 1' })

  h.updateError = { message: 'New password should be different from the old password.' }
  await user.click(screen.getByText('update'))
  await waitFor(() =>
    expect(String(alertSpy.mock.lastCall?.[0])).toContain('not used for this account'),
  )
  alertSpy.mockRestore()
})
