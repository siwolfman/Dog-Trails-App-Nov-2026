import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { PawRating, PawRatingInput } from './PawRating.tsx'

test('read-only rating is announced in words, with decimals for averages', () => {
  const { rerender } = render(<PawRating value={4} />)
  expect(screen.getByRole('img', { name: '4 out of 5 paw prints' })).toBeInTheDocument()
  rerender(<PawRating value={3.46} />)
  expect(screen.getByRole('img', { name: '3.5 out of 5 paw prints' })).toBeInTheDocument()
})

test('input offers exactly five paw prints, 1 to 5, and no zero', () => {
  render(<PawRatingInput value={null} onChange={() => {}} />)
  const radios = screen.getAllByRole('radio')
  expect(radios).toHaveLength(5)
  expect(screen.getByRole('radio', { name: '1 paw print' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: '5 paw prints' })).toBeInTheDocument()
  expect(screen.queryByRole('radio', { name: /^0/ })).toBeNull()
})

test('choosing a paw reports the number, and the arrow keys work', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<PawRatingInput value={null} onChange={onChange} />)
  await user.click(screen.getByRole('radio', { name: '3 paw prints' }))
  expect(onChange).toHaveBeenLastCalledWith(3)
  await user.keyboard('{ArrowRight}')
  expect(onChange).toHaveBeenLastCalledWith(4)
})

test('the selected state is not shown by color alone', () => {
  render(<PawRatingInput value={2} onChange={() => {}} />)
  expect(screen.getByRole('radio', { name: '2 paw prints' })).toBeChecked()
  expect(screen.getByText('2 of 5')).toBeInTheDocument()
})
