import { freshnessLabel, type Freshness } from '@/lib/dogStatus.ts'

const STYLE: Record<Freshness['kind'], string> = {
  fresh: 'bg-teal-deep text-card',
  recheck_due: 'bg-amber text-ink',
  stale: 'unverified-hatch text-ink border-2 border-dashed border-ink',
  none: 'unverified-hatch text-ink border-2 border-dashed border-ink',
}

export default function FreshnessStamp({
  freshness,
  className = '',
}: {
  freshness: Freshness
  className?: string
}) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 font-mono text-xs font-bold ${STYLE[freshness.kind]} ${className}`}
    >
      {freshnessLabel(freshness)}
    </span>
  )
}
