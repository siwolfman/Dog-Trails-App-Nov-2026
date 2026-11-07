import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthContext, LOCAL_AUTH, type AuthContextValue } from '@/auth/context.ts'
import { authValue } from '@/test/auth.ts'
import AuthPage from './AuthPage.tsx'

function renderPage(mode: 'login' | 'signup', value: AuthContextValue, state?: object) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter
        initialEntries={[{ pathname: `/${mode}`, ...(state ? { state } : {}) }]}
      >
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/" element={<p>the app</p>} />
          <Route path="/place/x" element={<p>deep link</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('sign up', () => {
  test('rejects a bad email and a short password without calling the backend', async () => {
    const user = userEvent.setup()
    const value = authValue()
    renderPage('signup', value)
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'longenough1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/)

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'emily@example.com')
    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8/)
    expect(value.signUp).not.toHaveBeenCalled()
  })

  test('submits a normalized email and password', async () => {
    const user = userEvent.setup()
    const value = authValue()
    renderPage('signup', value)
    await user.type(screen.getByLabelText('Email'), '  Emily@Example.com ')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(value.signUp).toHaveBeenCalledWith('emily@example.com', 'correct horse')
  })

  test('asks the user to confirm their email when the backend requires it', async () => {
    const user = userEvent.setup()
    const value = authValue({
      signUp: vi.fn(async () => ({ kind: 'confirm_email' as const })),
    })
    renderPage('signup', value)
    await user.type(screen.getByLabelText('Email'), 'emily@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByRole('heading', { name: 'Check your email.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('emily@example.com')).toBeInTheDocument()
  })

  test('shows the backend error', async () => {
    const user = userEvent.setup()
    const value = authValue({
      signUp: vi.fn(async () => ({
        kind: 'error' as const,
        message: 'An account with that email already exists.',
      })),
    })
    renderPage('signup', value)
    await user.type(screen.getByLabelText('Email'), 'emily@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/)
  })
})

describe('log in', () => {
  test('shows an error for wrong credentials', async () => {
    const user = userEvent.setup()
    const value = authValue({
      signIn: vi.fn(async () => 'That email and password do not match.'),
    })
    renderPage('login', value)
    await user.type(screen.getByLabelText('Email'), 'emily@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/)
  })

  test('the password can be revealed', async () => {
    const user = userEvent.setup()
    renderPage('login', authValue())
    const field = screen.getByLabelText('Password')
    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByLabelText('Show password'))
    expect(field).toHaveAttribute('type', 'text')
  })

  test('links between log in and sign up', () => {
    renderPage('login', authValue())
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup',
    )
  })
})

describe('redirects', () => {
  test('a signed-in user is sent back to where they were headed', () => {
    renderPage('login', authValue({ status: 'signed_in', email: 'a@b.co' }), {
      from: '/place/x',
    })
    expect(screen.getByText('deep link')).toBeInTheDocument()
  })

  test('without accounts (no backend) the page bounces to the app', () => {
    renderPage('login', LOCAL_AUTH)
    expect(screen.getByText('the app')).toBeInTheDocument()
  })
})
