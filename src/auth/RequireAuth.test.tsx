import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AccountBar from '@/components/AccountBar.tsx'
import { authValue } from '@/test/auth.ts'
import { AuthContext, LOCAL_AUTH, type AuthContextValue } from './context.ts'
import RequireAuth from './RequireAuth.tsx'

function renderAt(path: string, value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/secret" element={<p>secret content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

test('signed-out visitors are sent to login and never see the content', () => {
  renderAt('/secret', authValue({ status: 'signed_out' }))
  expect(screen.getByText('login page')).toBeInTheDocument()
  expect(screen.queryByText('secret content')).toBeNull()
})

test('nothing is shown while the session is loading', () => {
  renderAt('/secret', authValue({ status: 'loading' }))
  expect(screen.getByText('Loading…')).toBeInTheDocument()
  expect(screen.queryByText('secret content')).toBeNull()
  expect(screen.queryByText('login page')).toBeNull()
})

test('signed-in users see the content', () => {
  renderAt('/secret', authValue({ status: 'signed_in', email: 'a@b.co' }))
  expect(screen.getByText('secret content')).toBeInTheDocument()
})

test('with accounts disabled (no backend) there is no gate', () => {
  renderAt('/secret', LOCAL_AUTH)
  expect(screen.getByText('secret content')).toBeInTheDocument()
})

describe('AccountBar', () => {
  test('shows who is signed in and signs out', async () => {
    const user = userEvent.setup()
    const value = authValue({ status: 'signed_in', email: 'emily@example.com' })
    render(
      <AuthContext.Provider value={value}>
        <AccountBar />
      </AuthContext.Provider>,
    )
    expect(screen.getByText('emily@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(value.signOut).toHaveBeenCalled()
  })

  test('renders nothing without accounts or when signed out', () => {
    const { container, rerender } = render(
      <AuthContext.Provider value={LOCAL_AUTH}>
        <AccountBar />
      </AuthContext.Provider>,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(
      <AuthContext.Provider value={authValue()}>
        <AccountBar />
      </AuthContext.Provider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
