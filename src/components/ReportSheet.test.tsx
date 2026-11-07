import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'
import { dataClient } from '@/data/index.ts'
import { SeedFileSchema } from '@/data/schemas.ts'
import seedJson from '@data/places.seed.json'
import ReportSheet from './ReportSheet.tsx'

const place = SeedFileSchema.parse(seedJson).places[0]!

beforeEach(() => window.localStorage.clear())

test('rejects a too-short message and does not save', async () => {
  const user = userEvent.setup()
  render(<ReportSheet place={place} open onClose={() => {}} />)
  await user.type(screen.getByLabelText(/Tell us what you saw/), 'no')
  await user.click(screen.getByRole('button', { name: 'Send report' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/at least 5/)
  expect(await dataClient.listReports()).toHaveLength(0)
})

test('saves a report with the chosen type and shows thanks', async () => {
  const user = userEvent.setup()
  const onSubmitted = vi.fn()
  render(<ReportSheet place={place} open onClose={() => {}} onSubmitted={onSubmitted} />)
  await user.click(screen.getByRole('radio', { name: /Closure/ }))
  await user.type(
    screen.getByLabelText(/Tell us what you saw/),
    'Lower trail closed for repairs',
  )
  await user.click(screen.getByRole('button', { name: 'Send report' }))
  expect(await screen.findByText('Thank you.')).toBeInTheDocument()
  const reports = await dataClient.listReports()
  expect(reports).toHaveLength(1)
  expect(reports[0]).toMatchObject({
    place_id: place.id,
    report_type: 'closure',
    status: 'open',
    message: 'Lower trail closed for repairs',
  })
  expect(onSubmitted).toHaveBeenCalledWith('closure')
})

test('a filled honeypot is silently dropped', async () => {
  const user = userEvent.setup()
  render(<ReportSheet place={place} open onClose={() => {}} />)
  await user.type(
    screen.getByLabelText(/Tell us what you saw/),
    'Looks like a normal message',
  )
  await user.type(screen.getByLabelText(/Leave this empty/), 'bot')
  await user.click(screen.getByRole('button', { name: 'Send report' }))
  expect(await screen.findByText('Thank you.')).toBeInTheDocument()
  expect(await dataClient.listReports()).toHaveLength(0)
})

test('renders nothing when closed', () => {
  const { container } = render(
    <ReportSheet place={place} open={false} onClose={() => {}} />,
  )
  expect(container).toBeEmptyDOMElement()
})
