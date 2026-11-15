import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'
import seedJson from '@data/places.seed.json'
import { dataClient } from '@/data/index.ts'
import { SeedFileSchema } from '@/data/schemas.ts'
import ReviewSheet from './ReviewSheet.tsx'

const h = vi.hoisted(() => ({ search: vi.fn(), enabled: true }))
vi.mock('@/lib/giphy.ts', () => ({
  gifStillUrl: (g: { url: string }) => g.url,
  searchGifs: h.search,
  get giphyEnabled() {
    return h.enabled
  },
}))

const place = SeedFileSchema.parse(seedJson).places[0]!
const profile = { user_id: 'local-user', display_name: 'Maya' }
const gif = {
  id: 'abc123',
  title: 'happy dog',
  url: 'https://media.giphy.com/media/abc123/200w.gif',
}

beforeEach(async () => {
  window.localStorage.clear()
  h.enabled = true
  h.search.mockReset().mockResolvedValue([gif])
  await dataClient.createProfile('Maya')
})

const renderSheet = (onSaved = vi.fn()) =>
  render(
    <ReviewSheet
      place={place}
      open
      profile={profile}
      existing={null}
      onClose={() => {}}
      onProfileCreated={() => {}}
      onSaved={onSaved}
      onDeleted={() => {}}
    />,
  )

test('a chosen GIF is saved with the review', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  renderSheet(onSaved)
  await user.click(screen.getByRole('radio', { name: '5 paw prints' }))
  await user.click(screen.getByRole('button', { name: 'Add a GIF (optional)' }))
  await user.type(screen.getByLabelText('Search GIPHY'), 'dog')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await user.click(await screen.findByRole('button', { name: 'Use GIF: happy dog' }))
  expect(screen.getByRole('img', { name: 'happy dog' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Post review' }))
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(onSaved.mock.calls[0]?.[0]).toMatchObject({ rating: 5, gif })
  expect((await dataClient.listReviews(place.id))[0]?.gif).toEqual(gif)
})

test('the GIF can be removed before posting', async () => {
  const user = userEvent.setup()
  renderSheet()
  await user.click(screen.getByRole('radio', { name: '3 paw prints' }))
  await user.click(screen.getByRole('button', { name: 'Add a GIF (optional)' }))
  await user.type(screen.getByLabelText('Search GIPHY'), 'dog')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await user.click(await screen.findByRole('button', { name: 'Use GIF: happy dog' }))
  await user.click(screen.getByRole('button', { name: 'Remove GIF' }))
  await user.click(screen.getByRole('button', { name: 'Post review' }))
  await vi.waitFor(async () =>
    expect((await dataClient.listReviews(place.id))[0]?.gif).toBeNull(),
  )
})

test('without a GIPHY key there is no GIF button at all', () => {
  h.enabled = false
  renderSheet()
  expect(screen.queryByRole('button', { name: /GIF/ })).toBeNull()
  expect(within(screen.getByRole('dialog')).getByText(/Posting as/)).toBeInTheDocument()
})
