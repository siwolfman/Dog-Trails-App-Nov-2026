import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, vi } from 'vitest'
import { dataClient } from '@/data/index.ts'
import Admin from './Admin.tsx'

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.stubEnv('VITE_ADMIN_PASSWORD', 'letmein')
})

const renderAdmin = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>,
  )

async function unlock(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Password'), 'letmein')
  await user.click(screen.getByRole('button', { name: 'Unlock' }))
}

test('is locked until the right password is entered', async () => {
  const user = userEvent.setup()
  renderAdmin()
  expect(screen.queryByRole('tab', { name: 'Reports' })).toBeNull()
  await user.type(screen.getByLabelText('Password'), 'wrong')
  await user.click(screen.getByRole('button', { name: 'Unlock' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/not right/)
  await user.clear(screen.getByLabelText('Password'))
  await unlock(user)
  expect(await screen.findByRole('tab', { name: 'Reports' })).toBeInTheDocument()
})

test('fails closed when no password is configured', () => {
  vi.stubEnv('VITE_ADMIN_PASSWORD', '')
  renderAdmin()
  expect(screen.queryByLabelText('Password')).toBeNull()
  expect(screen.getByText(/VITE_ADMIN_PASSWORD/)).toBeInTheDocument()
})

test('editing and saving Sunday picks round-trips; invalid lists are blocked', async () => {
  const user = userEvent.setup()
  renderAdmin()
  await unlock(user)
  // Seed has 4 picks. Remove two -> 2 picks -> blocked.
  await user.click(await screen.findByRole('button', { name: /Remove Point Isabel/ }))
  await user.click(screen.getByRole('button', { name: /Remove Fort Funston/ }))
  await user.click(screen.getByRole('button', { name: 'Save picks' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/3 to 5/)

  // Add one back from the dropdown -> 3 picks -> saved.
  await user.selectOptions(screen.getByLabelText(/Add a verified place/), 'pl-windy-hill')
  await user.click(screen.getByRole('button', { name: 'Save picks' }))
  expect(await screen.findByRole('status')).toHaveTextContent(/Saved/)
  const saved = await dataClient.getSundayPicks()
  expect(saved.picks.map((p) => p.place_id)).toEqual([
    'pl-lands-end',
    'pl-pulgas-ridge',
    'pl-windy-hill',
  ])
})

test('unverified places cannot be added to picks', async () => {
  const user = userEvent.setup()
  renderAdmin()
  await unlock(user)
  await user.click(await screen.findByRole('button', { name: /Remove Point Isabel/ }))
  expect(screen.queryByRole('option', { name: /Ring Mountain/ })).toBeNull()
})

test('reports show up and can change status', async () => {
  const user = userEvent.setup()
  await dataClient.submitReport({
    place_id: 'pl-lands-end',
    report_type: 'closure',
    message: 'Trail closed near the steps',
  })
  renderAdmin()
  await unlock(user)
  await user.click(await screen.findByRole('tab', { name: 'Reports' }))
  expect(await screen.findByText('Trail closed near the steps')).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Status'), 'resolved')
  expect((await dataClient.listReports())[0]?.status).toBe('resolved')
})

test('events tab lists logged events', async () => {
  const user = userEvent.setup()
  await dataClient.logEvent('place_viewed', 'pl-lands-end', { slug: 'lands-end' })
  renderAdmin()
  await unlock(user)
  await user.click(await screen.findByRole('tab', { name: 'Events' }))
  expect(await screen.findByText('{"slug":"lands-end"}')).toBeInTheDocument()
})
