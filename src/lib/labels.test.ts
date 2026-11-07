import { durationLabel } from './labels.ts'

test('duration labels read naturally', () => {
  expect(durationLabel(null)).toBeNull()
  expect(durationLabel(45)).toBe('45 min')
  expect(durationLabel(60)).toBe('1 hr')
  expect(durationLabel(75)).toBe('1 hr 15 min')
  expect(durationLabel(120)).toBe('2 hrs')
  expect(durationLabel(150)).toBe('2 hrs 30 min')
})
