import { Link } from 'react-router'
import type { Place } from '@/data/schemas.ts'
import { STATUS_META, freshnessLabel, getDisplayRule } from '@/lib/dogStatus.ts'
import { REGION_LABELS, agencyShort } from '@/lib/labels.ts'
import { StatusTile } from './StatusBadge.tsx'

interface Props {
  place: Place
  today: string
  selected: boolean
  onHover?: (id: string | null) => void
}

export default function PlaceRow({ place, today, selected, onHover }: Props) {
  const rule = getDisplayRule(place, today)
  const meta = STATUS_META[rule.state]
  const stampText =
    rule.state === 'unverified' ? 'Not yet verified' : freshnessLabel(rule.freshness)

  return (
    <li id={`row-${place.id}`}>
      <Link
        to={`/place/${place.slug}`}
        state={{ from: 'list' }}
        onMouseEnter={() => onHover?.(place.id)}
        onMouseLeave={() => onHover?.(null)}
        className={`flex min-h-[72px] items-center gap-4 border-b border-line px-5 py-4 no-underline text-ink active:bg-sand/50 ${selected ? 'bg-teal-tint/60' : ''}`}
      >
        <StatusTile state={rule.state} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl leading-tight font-extrabold">
            {place.name}
          </span>
          <span className="block text-[0.95rem] leading-snug text-ink-soft">
            <b className="text-ink">{meta.label}</b>
            {rule.state === 'unverified' ? ', check agency page' : ''} · {place.city},{' '}
            {agencyShort(place.agency)}
          </span>
          <span className="mt-0.5 block font-mono text-xs text-ink-soft">
            {stampText}
          </span>
        </span>
        <span className="shrink-0 text-right text-sm leading-tight font-bold text-ink-soft">
          {REGION_LABELS[place.region]}
        </span>
      </Link>
    </li>
  )
}
