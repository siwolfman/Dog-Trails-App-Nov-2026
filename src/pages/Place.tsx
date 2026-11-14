import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import GoNoGoCard from '@/components/GoNoGoCard.tsx'
import Hero from '@/components/Hero.tsx'
import ReportSheet from '@/components/ReportSheet.tsx'
import { dataClient } from '@/data/index.ts'
import type { Place, PlaceRuleHistory } from '@/data/schemas.ts'
import { getDisplayRule, todayISO } from '@/lib/dogStatus.ts'
import {
  HAZARD_LABELS,
  REGION_LABELS,
  SHADE_LABELS,
  WATER_LABELS,
  agencyShort,
  durationLabel,
} from '@/lib/labels.ts'
import { track } from '@/lib/track.ts'
import { HEAT_COPY, fetchWeather, type Weather } from '@/lib/weather.ts'
import NotFound from './NotFound.tsx'

type Load =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; place: Place; history: PlaceRuleHistory[] }

function Tile({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string | undefined
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="font-mono text-xs font-bold tracking-wide text-ink-soft uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-xl leading-tight font-extrabold">{value}</p>
      {note && <p className="mt-0.5 text-sm text-ink-soft">{note}</p>}
    </div>
  )
}

type WeatherState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; weather: Weather }

function useWeather(place: Place | null): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'loading' })
  useEffect(() => {
    if (!place) return
    const ctrl = new AbortController()
    fetchWeather(place.lat, place.lng, ctrl.signal)
      .then((weather) => setState({ status: 'ready', weather }))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          setState({ status: 'error' })
      })
    return () => ctrl.abort()
  }, [place])
  return state
}

export default function PlaceRoute() {
  const { slug = '' } = useParams()
  // Keyed by slug so moving between places resets all state.
  return <PlaceView key={slug} slug={slug} />
}

function PlaceView({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? 'direct'
  const [reportOpen, setReportOpen] = useState(false)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const today = useMemo(() => todayISO(), [])

  useEffect(() => {
    let live = true
    dataClient.getPlace(slug).then(async (place) => {
      if (!live) return
      if (!place) return setLoad({ status: 'missing' })
      const history = await dataClient.listPlaceHistory(place.id)
      if (live) setLoad({ status: 'ready', place, history })
    })
    return () => {
      live = false
    }
  }, [slug])

  const place = load.status === 'ready' ? load.place : null

  useEffect(() => {
    if (place) {
      track('place_viewed', place.id, {
        slug: place.slug,
        state: getDisplayRule(place, today).state,
        from,
      })
    }
  }, [place, today, from])
  const weather = useWeather(place)

  useEffect(() => {
    document.title = place ? `${place.name} · Pawprint` : 'Pawprint'
    window.scrollTo(0, 0)
  }, [place])

  if (load.status === 'missing') return <NotFound />
  if (load.status === 'loading') {
    return (
      <main className="mx-auto max-w-xl px-5 py-10">
        <p className="font-mono text-ink-soft">Loading…</p>
      </main>
    )
  }

  const { place: p, history } = load
  const rule = getDisplayRule(p, today)
  const editorial = p.details_basis === 'editorial'
  const water = p.water_access ? WATER_LABELS[p.water_access] : null
  const shade = p.shade_level ? SHADE_LABELS[p.shade_level] : null
  const duration = durationLabel(p.typical_duration_minutes)
  const heatWarning =
    weather.status === 'ready' ? HEAT_COPY[weather.weather.heat].warning : null

  return (
    <div className="mx-auto max-w-xl pb-32">
      <div className="relative h-36">
        <Hero />
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Back"
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 grid size-12 place-items-center rounded-full bg-card shadow-md"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      </div>

      <main className="px-5 pt-5">
        <h1 className="text-[2.1rem]">{p.name}</h1>
        <p className="mt-1 text-ink-soft">
          {p.city} · {p.agency} · {REGION_LABELS[p.region]}
        </p>

        <div className="mt-5">
          <GoNoGoCard
            place={p}
            rule={rule}
            history={history}
            onSeen={() => track('gonogo_opened', p.id, { state: rule.state })}
            onSourceClick={() =>
              track('source_link_clicked', p.id, { state: rule.state, agency: p.agency })
            }
          />
        </div>

        <h2 className="mt-8 mb-3 text-2xl">Before you drive</h2>
        {heatWarning && (
          <p role="alert" className="mb-3 rounded-2xl bg-amber p-4 font-bold">
            <span aria-hidden="true">⚠ </span>
            {heatWarning}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Tile
            label="Heat today"
            value={
              weather.status === 'ready'
                ? `${HEAT_COPY[weather.weather.heat].label}, ${weather.weather.highF}°F`
                : weather.status === 'error'
                  ? 'Unavailable'
                  : 'Checking…'
            }
            note={
              weather.status === 'ready'
                ? `${weather.weather.summary}${weather.weather.rainChance !== null ? `, ${weather.weather.rainChance}% rain` : ''}`
                : weather.status === 'error'
                  ? 'Check a weather app'
                  : undefined
            }
          />
          {duration && <Tile label="Outing" value={duration} />}
          {water && <Tile label="Water" value={water} />}
          {shade && <Tile label="Shade" value={shade} />}
          {p.parking_notes && <Tile label="Parking" value={p.parking_notes} />}
        </div>
        {editorial && (water || shade || duration) && (
          <p className="mt-2 text-sm text-ink-soft">
            Outing length, water and shade are the editor&rsquo;s estimates, not from the
            agency.
          </p>
        )}

        {p.hazards.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-2xl">Watch for</h2>
            <ul className="flex list-none flex-wrap gap-2 p-0">
              {p.hazards.map((h) => (
                <li key={h} className="rounded-full bg-sand px-4 py-2 font-medium">
                  {HAZARD_LABELS[h] ?? h}
                </li>
              ))}
            </ul>
          </>
        )}

        <section
          aria-labelledby="report-cta"
          className="mt-8 rounded-card border-2 border-dashed border-ink p-5"
        >
          <h2 id="report-cta" className="text-xl">
            Rule look wrong or out of date?
          </h2>
          <p className="mt-1 text-ink-soft">Tell us and we will recheck the source.</p>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-button text-lg font-bold"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 21V4M6 5h11l-2 4 2 4H6" />
            </svg>
            Report an issue
          </button>
        </section>

        <p className="mt-8 text-sm text-ink-soft">
          Rules come from {agencyShort(p.agency)}. Posted signs on site always win.{' '}
          <Link to="/" className="font-bold underline">
            Back to all places
          </Link>
        </p>
      </main>

      <ReportSheet
        place={p}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={(type) => track('report_submitted', p.id, { type })}
      />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 flex-1 items-center justify-center rounded-full bg-button px-6 text-lg font-bold text-ink no-underline"
          >
            Directions<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </div>
  )
}
