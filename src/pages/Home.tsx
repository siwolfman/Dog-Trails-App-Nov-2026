import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AccountBar from '@/components/AccountBar.tsx'
import BottomSheet from '@/components/BottomSheet.tsx'
import FilterBar from '@/components/FilterBar.tsx'
import FilterSheet from '@/components/FilterSheet.tsx'
import PlaceRow from '@/components/PlaceRow.tsx'
import { usePlaces } from '@/data/usePlaces.ts'
import { track } from '@/lib/track.ts'
import { todayISO } from '@/lib/dogStatus.ts'
import {
  EMPTY_FILTERS,
  filterPlaces,
  parseFilters,
  serializeFilters,
  sortPlaces,
  type Filters,
} from '@/lib/filters.ts'

// Loaded on demand so the list renders before the map library arrives (matters on cellular).
const PlaceMap = lazy(() => import('@/components/PlaceMap.tsx'))

function describeFilter(f: Filters, which: string): string {
  switch (which) {
    case 'rule':
    case 'off_leash':
      return f.rules.join('+') || 'none'
    case 'duration':
      return f.duration.join('+') || 'none'
    case 'area':
      return f.areas.join('+') || 'none'
    case 'water':
      return String(f.water)
    case 'shade':
      return String(f.shade)
    default:
      return 'cleared'
  }
}

export default function Home() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { places, loading } = usePlaces()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const today = useMemo(() => todayISO(), [])

  const filters = useMemo(() => parseFilters(params), [params])
  const visible = useMemo(
    () => sortPlaces(filterPlaces(places, filters, today), today),
    [places, filters, today],
  )

  const onFilters = useCallback(
    (next: Filters, which: string = 'clear') => {
      // Free-text search is never logged. Log it once, when a search starts.
      if (which !== 'search') {
        track('filter_used', null, {
          filter: which,
          value: describeFilter(next, which),
        })
      } else if (!filters.q && next.q) {
        track('filter_used', null, { filter: 'search' })
      }
      setParams(serializeFilters(next), { replace: true })
    },
    [setParams, filters.q],
  )
  const openPlace = useCallback(
    (slug: string) => navigate(`/place/${slug}`, { state: { from: 'map' } }),
    [navigate],
  )

  return (
    <main className="relative h-dvh overflow-hidden md:flex">
      <h1 className="sr-only">Pawprint: dog rules for Bay Area trails and parks</h1>
      <Suspense
        fallback={<div className="absolute inset-0 bg-sand md:static md:flex-1" />}
      >
        <PlaceMap
          places={visible}
          today={today}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            if (id)
              document
                .getElementById(`row-${id}`)
                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }}
          onOpen={openPlace}
        />
      </Suspense>

      <FilterBar
        filters={filters}
        onChange={onFilters}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <BottomSheet
        title="Bay Area places"
        count={
          loading
            ? 'Loading'
            : `${visible.length} ${visible.length === 1 ? 'place' : 'places'}`
        }
      >
        <Link
          to="/sunday"
          className="mx-5 mt-4 flex min-h-14 items-center justify-between rounded-2xl bg-teal-deep px-5 py-3 font-bold text-card no-underline"
        >
          <span>
            <span className="block font-mono text-xs font-bold tracking-wide uppercase opacity-90">
              This week
            </span>
            Sunday picks
          </span>
          <span aria-hidden="true" className="text-2xl">
            →
          </span>
        </Link>

        {visible.length === 0 && !loading ? (
          <div className="px-5 py-10 text-center">
            <p className="font-display text-xl font-extrabold">No places match.</p>
            <p className="mt-1 text-ink-soft">Try removing a filter.</p>
            <button
              type="button"
              onClick={() => onFilters(EMPTY_FILTERS, 'clear')}
              className="mt-4 min-h-12 rounded-full bg-button px-6 font-bold text-ink"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="mt-2 list-none p-0">
            {visible.map((p) => (
              <PlaceRow
                key={p.id}
                place={p}
                today={today}
                selected={p.id === selectedId}
                onHover={setSelectedId}
              />
            ))}
          </ul>
        )}
        <AccountBar className="border-t border-line px-5 py-4" />
      </BottomSheet>

      <FilterSheet
        open={filtersOpen}
        filters={filters}
        resultCount={visible.length}
        onChange={onFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </main>
  )
}
