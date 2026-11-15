import { render, screen } from '@testing-library/react'
import seedJson from '@data/places.seed.json'
import { SeedFileSchema, type Place } from '@/data/schemas.ts'
import { getDisplayRule } from '@/lib/dogStatus.ts'
import DogTrailsSection from './DogTrailsSection.tsx'

const places = SeedFileSchema.parse(seedJson).places
const by = (slug: string): Place => places.find((p) => p.slug === slug)!
const show = (p: Place) =>
  render(<DogTrailsSection place={p} rule={getDisplayRule(p, '2026-11-16')} />)

test('lists trails the agency names, with lengths and honest totals', () => {
  show(by('windy-hill'))
  expect(
    screen.getByText(/9 dog-friendly trails named by the agency/),
  ).toBeInTheDocument()
  expect(screen.getByText(/length stated for 2: 2\.2 mi combined/)).toBeInTheDocument()
  expect(screen.getByText('Sausal Pond Loop')).toBeInTheDocument()
  expect(screen.getByText('1.6 mi')).toBeInTheDocument()
  // Trails with no published length show no number at all instead of an invented one.
  expect(screen.getAllByText(/\d(\.\d)? mi$/)).toHaveLength(2)
  expect(
    screen.getByRole('link', { name: /Midpen: Windy Hill preserve/ }),
  ).toHaveAttribute('href', 'https://www.openspace.org/preserves/windy-hill')
})

test('a single named trail uses the singular', () => {
  show(by('devils-slide'))
  expect(screen.getByText(/1 dog-friendly trail named by the agency/)).toBeInTheDocument()
  expect(screen.getByText('1.3 mi')).toBeInTheDocument()
})

test('park-wide facts are labeled as park-wide, not as trails', () => {
  show(by('tilden'))
  expect(
    screen.getByText(/does not list individual dog-friendly trails\. Park-wide facts/),
  ).toBeInTheDocument()
  expect(screen.getByText(/39\.41 miles of trails/)).toBeInTheDocument()
  expect(screen.queryByText(/dog-friendly trails? named/)).toBeNull()
})

test('says plainly when the agency publishes nothing', () => {
  show(by('baker-beach'))
  expect(
    screen.getByText(/does not publish dog-friendly trail details/),
  ).toBeInTheDocument()
})

test('no-dogs places have no dog-friendly trails', () => {
  show(by('muir-woods'))
  expect(screen.getByText(/Dogs are not allowed here/)).toBeInTheDocument()
})

test('unverified places do not show trail details', () => {
  show(by('ring-mountain'))
  expect(screen.getByText(/Trail details are not verified/)).toBeInTheDocument()
})
