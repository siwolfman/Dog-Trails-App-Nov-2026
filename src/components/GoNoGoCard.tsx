import type { Place, PlaceRuleHistory } from '@/data/schemas.ts'
import { STATUS_META, formatDate, type DisplayRule } from '@/lib/dogStatus.ts'
import { agencyShort } from '@/lib/labels.ts'
import { useOnVisible } from '@/lib/useOnVisible.ts'
import FreshnessStamp from './FreshnessStamp.tsx'
import StatusIcon from './StatusIcon.tsx'

const SURFACE: Record<DisplayRule['state'], string> = {
  off_leash_ok: 'bg-teal text-card',
  off_leash_zones: 'bg-teal-tint text-ink border-2 border-teal',
  leash_required: 'bg-amber text-ink',
  no_dogs: 'bg-oxblood text-card',
  unverified: 'unverified-hatch text-ink border-2 border-dashed border-ink',
}

const ICON_DISC: Record<DisplayRule['state'], string> = {
  off_leash_ok: 'bg-card text-teal',
  off_leash_zones: 'bg-card text-teal-deep border-2 border-teal',
  leash_required: 'bg-card text-ink',
  no_dogs: 'bg-card text-oxblood',
  unverified: 'bg-card text-ink border-2 border-dashed border-ink',
}

const UNVERIFIED_REASON = {
  needs_verification: 'We could not confirm this rule from an official source.',
  stale: 'This rule is past its recheck window, so we are not showing it as confirmed.',
  missing_data: 'The rule details for this place are incomplete.',
} as const

interface Props {
  place: Place
  rule: DisplayRule
  history: PlaceRuleHistory[]
  onSourceClick: () => void
  /** Fired once when at least half of the card has been on screen. */
  onSeen?: () => void
}

/**
 * Glanceable in two seconds: verdict first, then source and date, then (below the card) hazards.
 * Unverified places render a banner and NEVER a confident rule.
 */
export default function GoNoGoCard({
  place,
  rule,
  history,
  onSourceClick,
  onSeen,
}: Props) {
  const ref = useOnVisible<HTMLElement>(() => onSeen?.(), Boolean(onSeen))
  const meta = STATUS_META[rule.state]
  const unverified = rule.state === 'unverified'
  const latest = history[0]
  const sourceName = `${agencyShort(place.agency)}: dog rules`

  return (
    <section
      ref={ref}
      aria-labelledby="gonogo-heading"
      className={`rounded-card p-5 ${SURFACE[rule.state]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="gonogo-heading"
          className="font-mono text-sm font-bold tracking-wide uppercase"
        >
          Go / No-Go
        </h2>
        <FreshnessStamp freshness={rule.freshness} />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <span
          className={`grid size-[4.5rem] shrink-0 place-items-center rounded-full ${ICON_DISC[rule.state]}`}
          aria-hidden="true"
        >
          <StatusIcon state={rule.state} size={36} />
        </span>
        <div>
          <p className="font-display text-[3.25rem] leading-none font-extrabold tracking-tight">
            {meta.verdict}
          </p>
          <p className="mt-1 text-xl font-bold">{meta.label}</p>
        </div>
      </div>

      {unverified ? (
        <div role="note" className="mt-5 rounded-2xl bg-card p-4 text-ink">
          <p className="font-bold">Unverified, check the agency page</p>
          <p className="mt-1">{UNVERIFIED_REASON[rule.reason ?? 'needs_verification']}</p>
          {place.verification_note && (
            <p className="mt-2 text-ink-soft">{place.verification_note}</p>
          )}
          <p className="mt-2">
            Do not rely on a rule from anywhere else. Check before you drive.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-5 text-lg leading-snug">{rule.summary}</p>
          {rule.offLeashNotes && (
            <p className="mt-3 text-base leading-snug">
              <b>Off-leash notes: </b>
              {rule.offLeashNotes}
            </p>
          )}
        </>
      )}

      <div className="mt-5 border-t border-current/40 pt-4">
        <p className="font-mono text-xs font-bold tracking-wide uppercase">Source</p>
        <a
          href={place.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onSourceClick}
          className="mt-1 flex min-h-12 items-center justify-between gap-3 text-lg font-bold underline decoration-2 underline-offset-4"
        >
          <span>
            {unverified
              ? `Open the official ${agencyShort(place.agency)} page`
              : sourceName}
          </span>
          <span aria-hidden="true">↗</span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {!unverified && (
          <p className="mt-1 font-mono text-xs leading-relaxed">
            {latest ? `Rule unchanged since ${formatDate(latest.changed_on)} · ` : ''}
            {rule.freshness.kind !== 'none' &&
              `Next check due ${formatDate(rule.freshness.recheckOn)}`}
          </p>
        )}
        {!unverified && place.verified_by && (
          <p className="mt-1 font-mono text-xs leading-relaxed">
            Checked by {place.verified_by}
          </p>
        )}
      </div>
    </section>
  )
}
