import { useEffect, useRef, type ReactNode } from 'react'
import { REGIONS, type Region } from '@/data/schemas.ts'
import { DISPLAY_STATES, STATUS_META, type DisplayState } from '@/lib/dogStatus.ts'
import {
  DURATION_BUCKETS,
  DURATION_LABELS,
  EMPTY_FILTERS,
  type DurationBucket,
  type Filters,
} from '@/lib/filters.ts'
import { REGION_LABELS } from '@/lib/labels.ts'
import StatusIcon from './StatusIcon.tsx'

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function Option({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 text-base font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
        checked ? 'border-ink bg-ink text-card' : 'border-line bg-card text-ink'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}

interface Props {
  open: boolean
  filters: Filters
  resultCount: number
  onChange: (next: Filters, which: string) => void
  onClose: () => void
}

export default function FilterSheet({
  open,
  filters,
  resultCount,
  onChange,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-paper md:rounded-[1.75rem]"
      >
        <header className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="filters-title" className="text-2xl">
            Filters
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full px-4 font-bold underline"
          >
            Close
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto px-5 pb-4">
          <fieldset>
            <legend className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
              Dog rule
            </legend>
            <div className="flex flex-wrap gap-2">
              {DISPLAY_STATES.map((s: DisplayState) => (
                <Option
                  key={s}
                  checked={filters.rules.includes(s)}
                  onChange={() =>
                    onChange({ ...filters, rules: toggle(filters.rules, s) }, 'rule')
                  }
                >
                  <StatusIcon state={s} size={18} />
                  {STATUS_META[s].label}
                </Option>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
              Outing length
            </legend>
            <div className="flex flex-wrap gap-2">
              {DURATION_BUCKETS.map((d: DurationBucket) => (
                <Option
                  key={d}
                  checked={filters.duration.includes(d)}
                  onChange={() =>
                    onChange(
                      { ...filters, duration: toggle(filters.duration, d) },
                      'duration',
                    )
                  }
                >
                  {DURATION_LABELS[d]}
                </Option>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
              Area
            </legend>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r: Region) => (
                <Option
                  key={r}
                  checked={filters.areas.includes(r)}
                  onChange={() =>
                    onChange({ ...filters, areas: toggle(filters.areas, r) }, 'area')
                  }
                >
                  {REGION_LABELS[r]}
                </Option>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
              Comfort
            </legend>
            <div className="flex flex-wrap gap-2">
              <Option
                checked={filters.water}
                onChange={() => onChange({ ...filters, water: !filters.water }, 'water')}
              >
                Water for dogs
              </Option>
              <Option
                checked={filters.shade}
                onChange={() => onChange({ ...filters, shade: !filters.shade }, 'shade')}
              >
                Shade
              </Option>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Water, shade and outing length are editor estimates. Places without a value
              are hidden when these filters are on.
            </p>
          </fieldset>
        </div>

        <footer className="flex gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q }, 'clear')}
            className="min-h-14 rounded-full border-2 border-ink px-6 text-base font-bold"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 flex-1 rounded-full bg-ink px-6 text-base font-bold text-card"
          >
            Show {resultCount} {resultCount === 1 ? 'place' : 'places'}
          </button>
        </footer>
      </div>
    </div>
  )
}
