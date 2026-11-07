import { readFileSync } from 'node:fs'
import { SeedFileSchema } from '../src/data/schemas.ts'

const raw = JSON.parse(
  readFileSync(new URL('../data/places.seed.json', import.meta.url), 'utf8'),
)
const result = SeedFileSchema.safeParse(raw)
if (!result.success) {
  console.error('Seed file is invalid:')
  for (const issue of result.error.issues)
    console.error(' ', issue.path.join('.'), issue.message)
  process.exit(1)
}
const { places } = result.data
const verified = places.filter((p) => p.verification_status === 'verified')
const agencies = new Set(places.map((p) => p.agency))
console.log(
  `OK: ${places.length} places (${verified.length} verified, ${places.length - verified.length} need verification)`,
)
console.log(`Agencies (${agencies.size}): ${[...agencies].join('; ')}`)
for (const p of places) {
  const tag = p.verification_status === 'verified' ? 'verified ' : 'UNVERIFIED'
  console.log(`  ${tag}  ${p.name}  ->  ${p.source_url}`)
}
