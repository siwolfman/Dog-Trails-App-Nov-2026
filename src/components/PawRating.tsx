import { RATING_MAX } from '@/data/schemas.ts'

/**
 * Paw-print rating. A filled paw and an outlined paw differ in shape, not just color, so the score
 * reads without color. Rated paws use the teal brand color, empty ones a soft ink outline.
 */
function Paw({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
      fill={filled ? 'var(--color-teal)' : 'none'}
      stroke={filled ? 'var(--color-teal)' : 'var(--color-ink-soft)'}
      strokeWidth={filled ? 1 : 3}
    >
      <ellipse cx="32" cy="42" rx="12" ry="10" />
      <ellipse cx="17" cy="29" rx="5" ry="6.5" transform="rotate(-20 17 29)" />
      <ellipse cx="27" cy="19" rx="5" ry="7" />
      <ellipse cx="37" cy="19" rx="5" ry="7" />
      <ellipse cx="47" cy="29" rx="5" ry="6.5" transform="rotate(20 47 29)" />
    </svg>
  )
}

const PAWS = Array.from({ length: RATING_MAX }, (_, i) => i + 1)

export function pawLabel(n: number): string {
  return `${n} paw print${n === 1 ? '' : 's'}`
}

/** Read-only rating. `value` may be an average; the paws show it rounded to the nearest whole paw. */
export function PawRating({ value, size = 22 }: { value: number; size?: number }) {
  const filled = Math.round(value)
  return (
    <span
      role="img"
      aria-label={`${Number.isInteger(value) ? value : value.toFixed(1)} out of ${RATING_MAX} paw prints`}
      className="inline-flex items-center gap-0.5"
    >
      {PAWS.map((n) => (
        <Paw key={n} filled={n <= filled} size={size} />
      ))}
    </span>
  )
}

/** Rating input: five real radio buttons, so arrow keys and screen readers work natively. */
export function PawRatingInput({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: number | null
  onChange: (n: number) => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
        Your rating
      </legend>
      <div className="flex items-center gap-1">
        {PAWS.map((n) => (
          <label
            key={n}
            className="grid size-12 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink"
          >
            <input
              type="radio"
              name="paw-rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className="sr-only"
            />
            <Paw filled={value !== null && n <= value} size={36} />
            <span className="sr-only">{pawLabel(n)}</span>
          </label>
        ))}
        <span aria-hidden="true" className="ml-2 font-mono text-sm text-ink-soft">
          {value ? `${value} of ${RATING_MAX}` : 'Tap a paw'}
        </span>
      </div>
    </fieldset>
  )
}
