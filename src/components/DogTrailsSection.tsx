import type { Place } from '@/data/schemas.ts'
import type { DisplayRule } from '@/lib/dogStatus.ts'

function miles(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} mi`
}

/**
 * Dog-friendly trails, from the agency's own pages only. This section never estimates: it either
 * shows what an official page says (with the source and date), or says plainly that nothing is
 * published or verified.
 */
export default function DogTrailsSection({
  place,
  rule,
}: {
  place: Place
  rule: DisplayRule
}) {
  const info = place.dog_trails

  let body: React.ReactNode
  if (rule.state === 'no_dogs') {
    body = (
      <p>
        Dogs are not allowed here, so there are no dog-friendly trails. See the rule
        above.
      </p>
    )
  } else if (rule.state === 'unverified') {
    body = (
      <p>
        Trail details are not verified. This place&rsquo;s dog rule is unverified, so we
        are not showing which trails allow dogs.
      </p>
    )
  } else if (!info) {
    body = (
      <p>
        The agency does not publish dog-friendly trail details for this place, so we are
        not guessing. Check the posted map on site.
      </p>
    )
  } else {
    const known = info.trails.filter((t) => t.miles !== null)
    const total = known.reduce((sum, t) => sum + (t.miles ?? 0), 0)
    body = (
      <>
        {info.trails.length > 0 && (
          <>
            <p className="font-bold">
              {info.trails.length} dog-friendly{' '}
              {info.trails.length === 1 ? 'trail' : 'trails'} named by the agency{' '}
              <span className="font-normal text-ink-soft">
                {known.length > 0
                  ? `(length stated for ${known.length}: ${miles(total)} combined)`
                  : '(the agency gives no lengths)'}
              </span>
            </p>
            <ul className="mt-2 list-none space-y-2 p-0">
              {info.trails.map((t) => (
                <li key={t.name} className="rounded-xl bg-paper p-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 font-bold">
                    <span>{t.name}</span>
                    {t.miles !== null && (
                      <span className="font-mono text-sm">{miles(t.miles)}</span>
                    )}
                  </p>
                  <p className="text-sm text-ink-soft">{t.dog_note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-ink-soft">
              This is the list the agency publishes. There may be more trails: follow the
              posted map and signs.
            </p>
          </>
        )}
        {info.park_wide.length > 0 && (
          <>
            <p className={`font-bold ${info.trails.length > 0 ? 'mt-4' : ''}`}>
              {info.trails.length > 0
                ? 'Park-wide facts'
                : 'The agency does not list individual dog-friendly trails. Park-wide facts:'}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {info.park_wide.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 text-sm text-ink-soft">
          Checked {info.verified_on} from official pages:{' '}
          {info.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ', '}
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                {s.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </span>
          ))}
          .
        </p>
      </>
    )
  }

  return (
    <section aria-labelledby="dog-trails-title" className="mt-8">
      <h2 id="dog-trails-title" className="mb-3 text-2xl">
        Dog-friendly trails
      </h2>
      <div className="rounded-2xl border border-line bg-card p-4">{body}</div>
    </section>
  )
}
