import { render, screen } from '@testing-library/react'
import seedJson from '@data/places.seed.json'
import { SeedFileSchema, type Place } from '@/data/schemas.ts'
import { addDays, getDisplayRule } from '@/lib/dogStatus.ts'
import GoNoGoCard from './GoNoGoCard.tsx'

const seed = SeedFileSchema.parse(seedJson)
const verifiedPlace = seed.places.find((p) => p.slug === 'point-isabel')!
const TODAY = '2026-11-08'

function renderCard(place: Place, today = TODAY) {
  const history = seed.place_rule_history.filter((h) => h.place_id === place.id)
  return render(
    <GoNoGoCard
      place={place}
      rule={getDisplayRule(place, today)}
      history={history}
      onSourceClick={() => {}}
    />,
  )
}

describe('verified place', () => {
  test('shows verdict, rule, source link and verified stamp', () => {
    renderCard(verifiedPlace)
    expect(screen.getByText('Go.')).toBeInTheDocument()
    expect(screen.getByText('Off-leash OK')).toBeInTheDocument()
    expect(screen.getByText(verifiedPlace.rule_summary!)).toBeInTheDocument()
    expect(screen.getByText('Verified Nov 7, 2026')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /EBRPD: dog rules/ })
    expect(link).toHaveAttribute('href', verifiedPlace.source_url)
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByText(/Rule unchanged since Nov 7, 2026/)).toBeInTheDocument()
  })

  test('no-dogs places say no-go plainly', () => {
    renderCard(seed.places.find((p) => p.slug === 'muir-woods')!)
    expect(screen.getByText('No-go.')).toBeInTheDocument()
    expect(screen.getByText('No dogs')).toBeInTheDocument()
  })
})

describe('unverified places never render a confident rule', () => {
  const secret = 'SECRET CONFIDENT RULE TEXT'

  test('needs_verification, even if rule text leaks into the data', () => {
    const leaky: Place = {
      ...verifiedPlace,
      verification_status: 'needs_verification',
      rule_summary: secret,
      off_leash_notes: secret,
      verification_note: 'Conflicting official pages.',
    }
    renderCard(leaky)
    expect(screen.queryByText(new RegExp(secret))).toBeNull()
    expect(screen.queryByText('Go.')).toBeNull()
    expect(screen.queryByText('Off-leash OK')).toBeNull()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(screen.getByText('Unverified, check the agency page')).toBeInTheDocument()
    expect(screen.getByText('Conflicting official pages.')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Open the official EBRPD page/ }),
    ).toHaveAttribute('href', leaky.source_url)
  })

  test('a stale rule falls back to unverified', () => {
    const stale = { ...verifiedPlace, rule_summary: secret }
    renderCard(stale, addDays('2026-11-07', 90 + 31))
    expect(screen.queryByText(new RegExp(secret))).toBeNull()
    expect(screen.getByText('Unverified, check the agency page')).toBeInTheDocument()
    expect(screen.getByText(/past its recheck window/)).toBeInTheDocument()
    expect(screen.getByText('Stale, treat as unverified')).toBeInTheDocument()
  })

  test('every unverified place in the seed renders the banner and no verdict', () => {
    for (const p of seed.places.filter(
      (x) => x.verification_status === 'needs_verification',
    )) {
      const { unmount } = renderCard(p)
      expect(screen.getByText('Unverified, check the agency page')).toBeInTheDocument()
      expect(
        screen.queryByText(/^(Go\.|No-go\.|Go, on leash\.|Go, with limits\.)$/),
      ).toBeNull()
      unmount()
    }
  })
})
