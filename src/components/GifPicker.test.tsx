import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'
import GifPicker from './GifPicker.tsx'

// `impl` is swapped per test. The mocked export is a plain function so a deliberately rejecting
// implementation is not tracked (and reported as unhandled) by the mock library.
const h = vi.hoisted(() => ({
  search: vi.fn(),
  impl: null as null | (() => Promise<unknown>),
}))
vi.mock('@/lib/giphy.ts', () => ({
  searchGifs: (...args: unknown[]) => (h.impl ?? h.search)(...(args as [])),
}))

const gif = (id: string, title: string) => ({
  id,
  title,
  url: `https://media.giphy.com/media/${id}/200w.gif`,
})

beforeEach(() => {
  h.search.mockReset()
  h.impl = null
})

test('searches only when asked, then returns the chosen GIF', async () => {
  const user = userEvent.setup()
  const onPick = vi.fn()
  h.search.mockResolvedValue([gif('aaa111', 'happy dog'), gif('bbb222', 'puppy')])
  render(<GifPicker onPick={onPick} onCancel={() => {}} />)
  expect(h.search).not.toHaveBeenCalled()

  await user.type(screen.getByLabelText('Search GIPHY'), 'dog')
  expect(h.search).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await user.click(await screen.findByRole('button', { name: 'Use GIF: puppy' }))
  expect(onPick).toHaveBeenCalledWith(gif('bbb222', 'puppy'))
  expect(h.search.mock.calls[0]?.[0]).toBe('dog')
})

test('says so when nothing matches', async () => {
  const user = userEvent.setup()
  h.search.mockResolvedValue([])
  render(<GifPicker onPick={() => {}} onCancel={() => {}} />)
  await user.type(screen.getByLabelText('Search GIPHY'), 'zzzz')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  expect(await screen.findByText(/No GIFs found for/)).toBeInTheDocument()
})

test('shows a friendly error when GIPHY fails', async () => {
  const user = userEvent.setup()
  h.impl = async () => {
    throw new Error('boom')
  }
  render(<GifPicker onPick={() => {}} onCancel={() => {}} />)
  await user.type(screen.getByLabelText('Search GIPHY'), 'dog')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not be reached/)
})

test('credits GIPHY and discloses that searches are sent to it', () => {
  render(<GifPicker onPick={() => {}} onCancel={() => {}} />)
  expect(screen.getByText(/Powered by GIPHY/)).toHaveTextContent(
    /search is sent to GIPHY/,
  )
})

test('pressing Enter searches and does not submit a surrounding form', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault())
  h.search.mockResolvedValue([gif('aaa111', 'happy dog')])
  render(
    <form onSubmit={onSubmit}>
      <GifPicker onPick={() => {}} onCancel={() => {}} />
    </form>,
  )
  await user.type(screen.getByLabelText('Search GIPHY'), 'dog{Enter}')
  expect(
    await screen.findByRole('button', { name: 'Use GIF: happy dog' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Search' }))
  expect(onSubmit).not.toHaveBeenCalled()
})
