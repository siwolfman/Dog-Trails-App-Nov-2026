import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach } from 'vitest'
import seedJson from '@data/places.seed.json'
import { dataClient } from '@/data/index.ts'
import { SeedFileSchema } from '@/data/schemas.ts'
import ReviewsSection, { summarize } from './ReviewsSection.tsx'

const place = SeedFileSchema.parse(seedJson).places[0]!

beforeEach(() => window.localStorage.clear())

async function openSheet(user: ReturnType<typeof userEvent.setup>) {
  render(<ReviewsSection place={place} />)
  await user.click(await screen.findByRole('button', { name: 'Write a review' }))
  return screen.getByRole('dialog')
}

test('starts with no ratings', async () => {
  render(<ReviewsSection place={place} />)
  expect(await screen.findByText('No ratings yet')).toBeInTheDocument()
})

test('first review asks for a display name and promises the email stays private', async () => {
  const user = userEvent.setup()
  const dialog = await openSheet(user)
  expect(
    within(dialog).getByRole('heading', { name: 'Choose a display name' }),
  ).toBeInTheDocument()
  expect(within(dialog).getByText(/Your email always stays private/)).toBeInTheDocument()
  expect(within(dialog).getByText(/only your display name/)).toBeInTheDocument()
})

test('rejects an email as a display name', async () => {
  const user = userEvent.setup()
  const dialog = await openSheet(user)
  await user.type(within(dialog).getByLabelText('Display name'), 'me@example.com')
  await user.click(within(dialog).getByRole('button', { name: /Save name/ }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    /Do not use an email/,
  )
  expect(await dataClient.getMyProfile()).toBeNull()
})

test('name, then paws required, then the review appears with the average', async () => {
  const user = userEvent.setup()
  const dialog = await openSheet(user)
  await user.type(within(dialog).getByLabelText('Display name'), 'Maya')
  await user.click(within(dialog).getByRole('button', { name: /Save name/ }))

  expect(await within(dialog).findByText(/Posting as/)).toHaveTextContent('Maya')
  // No rating chosen yet.
  await user.click(within(dialog).getByRole('button', { name: 'Post review' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(/1 to 5 paw prints/)
  expect(await dataClient.listReviews(place.id)).toHaveLength(0)

  await user.click(within(dialog).getByRole('radio', { name: '4 paw prints' }))
  await user.type(
    within(dialog).getByLabelText(/Comment/),
    'Lots of dogs, big open space',
  )
  await user.click(within(dialog).getByRole('button', { name: 'Post review' }))

  expect(await screen.findByText('Lots of dogs, big open space')).toBeInTheDocument()
  expect(screen.getByText('Maya')).toBeInTheDocument()
  expect(screen.getByText(/4\.0/)).toBeInTheDocument()
  expect(screen.getByText(/1 review$/)).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).toBeNull()
  // The stored review carries the name only: nothing in the app can hold an email.
  expect(JSON.stringify(await dataClient.listReviews(place.id))).not.toMatch(/@/)
})

test('a person can edit and delete their own review', async () => {
  const user = userEvent.setup()
  await dataClient.createProfile('Maya')
  await dataClient.saveReview({
    place_id: place.id,
    rating: 5,
    comment: 'Perfect',
    gif: null,
  })
  render(<ReviewsSection place={place} />)
  await user.click(await screen.findByRole('button', { name: 'Edit your review' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByRole('radio', { name: '5 paw prints' })).toBeChecked()
  await user.click(within(dialog).getByRole('radio', { name: '2 paw prints' }))
  await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText(/2\.0/)).toBeInTheDocument()
  expect(await dataClient.listReviews(place.id)).toHaveLength(1)

  await user.click(screen.getByRole('button', { name: 'Edit your review' }))
  window.confirm = () => true
  await user.click(screen.getByRole('button', { name: 'Delete my review' }))
  expect(await screen.findByText('No ratings yet')).toBeInTheDocument()
})

test('a GIPHY GIF on a review is shown with alt text', async () => {
  await dataClient.createProfile('Maya')
  await dataClient.saveReview({
    place_id: place.id,
    rating: 5,
    comment: null,
    gif: {
      id: 'abc',
      url: 'https://media2.giphy.com/media/abc/giphy.gif',
      title: 'happy dog',
    },
  })
  render(<ReviewsSection place={place} />)
  expect(await screen.findByRole('img', { name: 'happy dog' })).toHaveAttribute(
    'src',
    'https://media2.giphy.com/media/abc/giphy.gif',
  )
})

test('summarize ignores hidden reviews', () => {
  const r = (rating: number, hidden = false) => ({ rating, hidden }) as never
  expect(summarize([])).toEqual({ count: 0, average: null })
  expect(summarize([r(5), r(3), r(1, true)])).toEqual({ count: 2, average: 4 })
})
