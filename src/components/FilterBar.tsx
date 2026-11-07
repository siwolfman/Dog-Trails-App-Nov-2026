import type { ReactNode } from 'react'
import { activeFilterCount, type Filters } from '@/lib/filters.ts'

export function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 px-5 text-base font-bold shadow-sm transition-colors ${
        pressed
          ? 'border-ink bg-ink text-card'
          : 'border-card bg-card text-ink hover:border-line'
      }`}
    >
      {pressed && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M5.5 12.6l4.4 4.4L18.6 7.8" />
        </svg>
      )}
      {children}
    </button>
  )
}

interface Props {
  filters: Filters
  onChange: (next: Filters, which: string) => void
  onOpenFilters: () => void
}

export default function FilterBar({ filters, onChange, onOpenFilters }: Props) {
  const offLeashOn =
    filters.rules.includes('off_leash_ok') && filters.rules.includes('off_leash_zones')
  const count = activeFilterCount(filters)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:left-[27rem]">
      <div className="pointer-events-auto mx-auto max-w-xl md:mx-0">
        <label className="flex min-h-14 items-center gap-3 rounded-full bg-card px-5 shadow-md focus-within:outline-3 focus-within:outline-ink">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L20 20" />
          </svg>
          <span className="sr-only">Search a trail or park</span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value }, 'search')}
            placeholder="Search a trail or park"
            className="min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-ink-soft"
          />
        </label>
      </div>
      <div
        className="pointer-events-auto -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:px-0"
        role="group"
        aria-label="Quick filters"
      >
        <Chip
          pressed={offLeashOn}
          onClick={() =>
            onChange(
              {
                ...filters,
                rules: offLeashOn
                  ? filters.rules.filter(
                      (r) => r !== 'off_leash_ok' && r !== 'off_leash_zones',
                    )
                  : [
                      ...new Set([
                        ...filters.rules,
                        'off_leash_ok' as const,
                        'off_leash_zones' as const,
                      ]),
                    ],
              },
              'off_leash',
            )
          }
        >
          Off-leash
        </Chip>
        <Chip
          pressed={filters.duration.length === 1 && filters.duration[0] === 'short'}
          onClick={() =>
            onChange(
              {
                ...filters,
                duration: filters.duration.includes('short') ? [] : ['short'],
              },
              'duration',
            )
          }
        >
          Under 1 hr
        </Chip>
        <Chip
          pressed={filters.water}
          onClick={() => onChange({ ...filters, water: !filters.water }, 'water')}
        >
          Water for dogs
        </Chip>
        <Chip
          pressed={filters.shade}
          onClick={() => onChange({ ...filters, shade: !filters.shade }, 'shade')}
        >
          Shade
        </Chip>
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-card px-5 text-base font-bold text-ink shadow-sm"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          Filters{count > 0 ? ` (${count})` : ''}
        </button>
      </div>
    </div>
  )
}
