import { useEffect, useRef, useState, type FormEvent } from 'react'
import { dataClient } from '@/data/index.ts'
import {
  NewReportSchema,
  REPORT_TYPES,
  type Place,
  type ReportType,
} from '@/data/schemas.ts'

const TYPE_LABELS: Record<ReportType, { label: string; hint: string }> = {
  wrong_rule: {
    label: 'Wrong rule',
    hint: 'The card does not match the sign or agency page',
  },
  closure: { label: 'Closure', hint: 'A trail, beach or area is closed' },
  other: { label: 'Something else', hint: 'Anything else we should recheck' },
}

type Phase = 'form' | 'sending' | 'done'

interface Props {
  place: Place
  open: boolean
  onClose: () => void
  onSubmitted?: (type: ReportType) => void
}

export default function ReportSheet({ place, open, onClose, onSubmitted }: Props) {
  const [type, setType] = useState<ReportType>('wrong_rule')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!open) return
    headingRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    // Bots fill hidden fields. Pretend it worked and drop it.
    if (honeypot) return setPhase('done')
    const parsed = NewReportSchema.safeParse({
      place_id: place.id,
      report_type: type,
      message,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your report.')
      return
    }
    setError(null)
    setPhase('sending')
    try {
      await dataClient.submitReport(parsed.data)
      onSubmitted?.(type)
      setPhase('done')
    } catch {
      setError('Could not save your report. Please try again.')
      setPhase('form')
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-[1.75rem]"
      >
        {phase === 'done' ? (
          <div className="py-4 text-center">
            <h2
              id="report-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl outline-none"
            >
              Thank you.
            </h2>
            <p className="mt-2 text-lg">
              We will recheck {place.name} against the official source.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-14 w-full rounded-full bg-ink px-6 text-lg font-bold text-card"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="flex items-start justify-between gap-3">
              <h2
                id="report-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl outline-none"
              >
                Report an issue
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-full px-4 font-bold underline"
              >
                Cancel
              </button>
            </div>
            <p className="mt-1 text-ink-soft">{place.name}</p>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
                What is wrong?
              </legend>
              <div className="space-y-2">
                {REPORT_TYPES.map((t) => (
                  <label
                    key={t}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
                      type === t ? 'border-ink bg-card' : 'border-line bg-card'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_type"
                      value={t}
                      checked={type === t}
                      onChange={() => setType(t)}
                      className="size-5 accent-ink"
                    />
                    <span>
                      <span className="block font-bold">{TYPE_LABELS[t].label}</span>
                      <span className="block text-sm text-ink-soft">
                        {TYPE_LABELS[t].hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold tracking-wide text-ink-soft uppercase">
                Tell us what you saw
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'report-error' : undefined}
                placeholder="For example: a sign at the trailhead says dogs must be leashed."
                className="w-full rounded-2xl border-2 border-line bg-card p-4 text-lg"
              />
            </label>

            {/* Honeypot: hidden from people, tempting to bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px]">
              <label>
                Leave this empty
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            {error && (
              <p id="report-error" role="alert" className="mt-3 font-bold text-oxblood">
                {error}
              </p>
            )}
            <p className="mt-3 text-sm text-ink-soft">
              We do not attach your account or email to this report.
            </p>

            <button
              type="submit"
              disabled={phase === 'sending'}
              className="mt-5 min-h-14 w-full rounded-full bg-ink px-6 text-lg font-bold text-card disabled:opacity-60"
            >
              {phase === 'sending' ? 'Sending…' : 'Send report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
