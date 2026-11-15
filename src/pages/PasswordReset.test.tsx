import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthContext, LOCAL_AUTH, type AuthContextValue } from '@/auth/context.ts'
import { authValue } from '@/test/auth.ts'
import AuthPage from './AuthPage.tsx'
import ForgotPassword from './ForgotPassword.tsx'
import ResetPassword from './ResetPassword.tsx'

function renderAt(path: string, value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<p>the app</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

test('the login page links to password reset', () => {
  renderAt('/login', authValue())
  expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
    'href',
    '/forgot-password',
  )
})

describe('forgot password', () => {
  test('rejects a bad email without calling the backend', async () => {
    const user = userEvent.setup()
    const value = authValue()
    renderAt('/forgot-password', value)
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/)
    expect(value.requestPasswordReset).not.toHaveBeenCalled()
  })

  test('requests a link for the normalized email and shows the same message either way', async () => {
    const user = userEvent.setup()
    const value = authValue()
    renderAt('/forgot-password', value)
    await user.type(screen.getByLabelText('Email'), ' Emily@Example.com ')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(value.requestPasswordReset).toHaveBeenCalledWith('emily@example.com')
    expect(
      await screen.findByRole('heading', { name: 'Check your email.' }),
    ).toBeInTheDocument()
    // Does not claim that an account exists.
    expect(screen.getByText(/If there is an account for/)).toBeInTheDocument()
  })

  test('shows a backend problem such as a rate limit', async () => {
    const user = userEvent.setup()
    const value = authValue({
      requestPasswordReset: vi.fn(
        async () => 'Too many attempts. Please wait a few minutes and try again.',
      ),
    })
    renderAt('/forgot-password', value)
    await user.type(screen.getByLabelText('Email'), 'emily@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many attempts/)
  })

  test('explains when there is no backend', () => {
    renderAt('/forgot-password', LOCAL_AUTH)
    expect(screen.getByText(/needs the Supabase backend/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDisabled()
  })
})

describe('reset password', () => {
  test('a link with no session is reported as expired', () => {
    renderAt('/reset-password', authValue({ status: 'signed_out' }))
    expect(
      screen.getByRole('heading', { name: 'This link has expired.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
    expect(screen.queryByLabelText('New password')).toBeNull()
  })

  test('waits while the session loads', () => {
    renderAt('/reset-password', authValue({ status: 'loading' }))
    expect(screen.getByText('Checking your link…')).toBeInTheDocument()
  })

  test('validates length and matching before calling the backend', async () => {
    const user = userEvent.setup()
    const value = authValue({ status: 'signed_in', email: 'a@b.co' })
    renderAt('/reset-password', value)
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/)

    // Long enough but missing character types: the message says which.
    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), 'longenoughpassword')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /an uppercase letter, a number and a symbol/,
    )

    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), 'Long-enough-one1')
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'Long-enough-two2')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/)
    expect(value.updatePassword).not.toHaveBeenCalled()
  })

  test('shows the password rules on the new-password field', () => {
    renderAt('/reset-password', authValue({ status: 'signed_in', email: 'a@b.co' }))
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      /uppercase letter/,
    )
  })

  test('saves a valid new password and then continues to the app', async () => {
    const user = userEvent.setup()
    const value = authValue({ status: 'signed_in', email: 'a@b.co' })
    renderAt('/reset-password', value)
    await user.type(screen.getByLabelText('New password'), 'A-brand-new-pass1')
    await user.type(screen.getByLabelText('Confirm new password'), 'A-brand-new-pass1')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(value.updatePassword).toHaveBeenCalledWith('A-brand-new-pass1')
    expect(
      await screen.findByRole('heading', { name: 'Password updated.' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue to the app' }))
    expect(screen.getByText('the app')).toBeInTheDocument()
  })

  test('shows a backend error', async () => {
    const user = userEvent.setup()
    const value = authValue({
      status: 'signed_in',
      email: 'a@b.co',
      updatePassword: vi.fn(
        async () => 'Choose a password you have not used for this account before.',
      ),
    })
    renderAt('/reset-password', value)
    await user.type(screen.getByLabelText('New password'), 'A-brand-new-pass1')
    await user.type(screen.getByLabelText('Confirm new password'), 'A-brand-new-pass1')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /not used for this account/,
    )
  })

  describe('emailed link with a token (cannot be used up by mail scanners)', () => {
    const link = '/reset-password?token_hash=abc123&type=recovery'

    test('shows a confirm step first and does NOT spend the token on page load', () => {
      const value = authValue({ status: 'signed_out' })
      renderAt(link, value)
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
      expect(screen.queryByText('This link has expired.')).toBeNull()
      expect(value.verifyRecovery).not.toHaveBeenCalled()
    })

    test('pressing Continue verifies the token, then shows the new password form', async () => {
      const user = userEvent.setup()
      // Even when another account is signed in here, the link's own account is the one recovered.
      const value = authValue({ status: 'signed_in', email: 'someone@else.com' })
      renderAt(link, value)
      await user.click(screen.getByRole('button', { name: 'Continue' }))
      expect(value.verifyRecovery).toHaveBeenCalledWith('abc123')
      expect(await screen.findByLabelText('New password')).toBeInTheDocument()
    })

    test('an expired or used token shows an error and a way to request a new link', async () => {
      const user = userEvent.setup()
      const value = authValue({
        status: 'signed_out',
        verifyRecovery: vi.fn(
          async () => 'This link has expired or was already used. Request a new one.',
        ),
      })
      renderAt(link, value)
      await user.click(screen.getByRole('button', { name: 'Continue' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /expired or was already used/,
      )
      expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
        'href',
        '/forgot-password',
      )
    })
  })
})
