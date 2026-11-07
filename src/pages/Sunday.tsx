import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import AccountBar from '@/components/AccountBar.tsx'
import { StatusTile } from '@/components/StatusBadge.tsx'
import FreshnessStamp from '@/components/FreshnessStamp.tsx'
import { dataClient } from '@/data/index.ts'
import type { Place, SundayPick } from '@/data/schemas.ts'
import { STATUS_META, formatDate, getDisplayRule, todayISO } from '@/lib/dogStatus.ts'
import { agencyShort } from '@/lib/labels.ts'
import { track } from '@/lib/track.ts'
import { sundayOf } from '@/lib/weeks.ts'

interface Data {
  weekStart: string | null
  picks: SundayPick[]
  places: Place[]
}

export default function Sunday() {
  const [data, setData] = useState<Data | null>(null)
  const today = useMemo(() => todayISO(), [])

  useEffect(() => {
    document.title = 'Sunday Picks · Pawprint'
    track('sunday_viewed')
    let live = true
    Promise.all([dataClient.getSundayPicks(), dataClient.listPlaces()]).then(
      ([{ weekStart, picks }, places]) => live && setData({ weekStart, picks, places }),
    )
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-16">
      <Link to="/" className="inline-flex min-h-12 items-center font-bold underline">
        ← All places
      </Link>

      <header className="mt-2">
        <p className="font-mono text-sm font-bold tracking-wide text-ink-soft uppercase">
          Hand-picked
        </p>
        <h1 className="text-5xl">Sunday picks</h1>
        {data?.weekStart && (
          <p className="mt-2 text-lg text-ink-soft">
            For Sunday, {formatDate(sundayOf(data.weekStart))}. Each rule below was
            checked against the agency&rsquo;s own page.
          </p>
        )}
      </header>

      <AccountBar className="mt-4" />

      {!data ? (
        <p className="mt-8 font-mono text-ink-soft">Loading…</p>
      ) : data.picks.length === 0 ? (
        <p className="mt-8 rounded-card border-2 border-dashed border-ink p-5 text-lg">
          No picks yet for this week. Check back Thursday.
        </p>
      ) : (
        <ol className="mt-6 list-none space-y-4 p-0">
          {data.picks.map((pick, i) => {
            const place = data.places.find((p) => p.id === pick.place_id)
            if (!place) return null
            const rule = getDisplayRule(place, today)
            return (
              <li key={pick.id}>
                <Link
                  to={`/place/${place.slug}`}
                  state={{ from: 'sunday' }}
                  className="block rounded-card border border-line bg-card p-5 text-ink no-underline active:bg-sand/50"
                >
                  <div className="flex items-center gap-4">
                    <StatusTile state={rule.state} size={64} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-ink-soft">
                        PICK {i + 1}
                      </p>
                      <h2 className="text-2xl">{place.name}</h2>
                      <p className="text-ink-soft">
                        <b className="text-ink">{STATUS_META[rule.state].label}</b> ·{' '}
                        {place.city}, {agencyShort(place.agency)}
                      </p>
                    </div>
                  </div>
                  {pick.note && <p className="mt-3 text-lg leading-snug">{pick.note}</p>}
                  <FreshnessStamp freshness={rule.freshness} className="mt-3" />
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
