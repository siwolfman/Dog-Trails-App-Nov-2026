import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import seedJson from '@data/places.seed.json'
import { SeedFileSchema } from './schemas.ts'

const seed = SeedFileSchema.parse(seedJson)
const publicDir = path.resolve(import.meta.dirname, '../../public')

describe('place photos', () => {
  test('every photo file exists and is a real image', () => {
    for (const p of seed.places) {
      if (!p.photo) continue
      const file = path.join(publicDir, p.photo.src)
      expect(existsSync(file), `${p.slug}: ${p.photo.src}`).toBe(true)
      expect(statSync(file).size, p.slug).toBeGreaterThan(20_000)
    }
  })

  test('every photo is credited, licensed and traceable to Wikimedia Commons', () => {
    for (const p of seed.places) {
      if (!p.photo) continue
      expect(p.photo.credit, p.slug).toBeTruthy()
      expect(p.photo.license, p.slug).toBeTruthy()
      expect(new URL(p.photo.source_url).hostname, p.slug).toBe('commons.wikimedia.org')
      // Attribution licenses must link to the license text.
      if (/^CC BY/.test(p.photo.license)) expect(p.photo.license_url, p.slug).toBeTruthy()
    }
  })

  test('each place uses its own photo file', () => {
    const srcs = seed.places.flatMap((p) => (p.photo ? [p.photo.src] : []))
    expect(new Set(srcs).size).toBe(srcs.length)
    for (const p of seed.places)
      if (p.photo) expect(p.photo.src).toBe(`/photos/${p.slug}.jpg`)
  })
})

describe('dog-friendly trail facts', () => {
  test('are never recorded for no-dogs or unverified places', () => {
    for (const p of seed.places) {
      if (p.dog_status === 'no_dogs' || p.verification_status !== 'verified')
        expect(p.dog_trails, p.slug).toBeNull()
    }
  })

  test('always carry an official source and a check date', () => {
    const withTrails = seed.places.filter((p) => p.dog_trails)
    expect(withTrails.length).toBeGreaterThan(0)
    for (const p of withTrails) {
      expect(p.dog_trails!.verified_on, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      for (const s of p.dog_trails!.sources) expect(s.url, p.slug).toMatch(/^https:\/\//)
      // Something to show: a trail or a park-wide fact.
      expect(
        p.dog_trails!.trails.length + p.dog_trails!.park_wide.length,
        p.slug,
      ).toBeGreaterThan(0)
    }
  })
})
