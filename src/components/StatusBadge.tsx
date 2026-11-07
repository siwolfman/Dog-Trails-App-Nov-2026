import { STATUS_META, type DisplayState } from '@/lib/dogStatus.ts'
import StatusIcon from './StatusIcon.tsx'

const TILE: Record<DisplayState, string> = {
  off_leash_ok: 'bg-teal text-card',
  off_leash_zones: 'bg-teal-tint text-teal-deep border-2 border-teal',
  leash_required: 'bg-amber text-ink',
  no_dogs: 'bg-oxblood text-card',
  unverified: 'unverified-hatch text-ink border-2 border-dashed border-ink',
}

/** Square status tile: color + icon (label lives next to it, never color alone). */
export function StatusTile({ state, size = 56 }: { state: DisplayState; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl ${TILE[state]}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <StatusIcon state={state} size={Math.round(size * 0.5)} />
    </span>
  )
}

/** Inline pill with icon + label. */
export default function StatusBadge({ state }: { state: DisplayState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2 text-sm font-bold ${TILE[state]}`}
    >
      <StatusIcon state={state} size={18} />
      {STATUS_META[state].label}
    </span>
  )
}
