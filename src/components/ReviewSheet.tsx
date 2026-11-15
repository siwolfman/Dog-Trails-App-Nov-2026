import { useEffect, useRef, useState, type FormEvent } from 'react'
import { dataClient } from '@/data/index.ts'
import {
  COMMENT_MAX,
  DisplayNameSchema,
  NewReviewSchema,
  type Place,
  type Profile,
  type Review,
  type ReviewGif,
} from '@/data/schemas.ts'
import { giphyEnabled } from '@/lib/giphy.ts'
import GifPicker from './GifPicker.tsx'
import { PawRatingInput } from './PawRating.tsx'

interface Props {
  place: Place
  open: boolean
  /** Null until the person has chosen a display name. */
  profile: Profile | null
  /** The person's current review of this place, if they already wrote one. */
  existing: Review | null
  onClose: () => void
  onProfileCreated: (profile: Profile) => void
  onSaved: (review: Review) => void
  onDeleted: () => void
}

const sheetClass =
  'max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-[1.75rem]'
const primaryButton =
  'mt-5 min-h-14 w-full rounded-full bg-button px-6 text-lg font-bold text-ink disabled:opacity-60'

/**
 * Two steps in one dialog. First time: choose a display name (the only name ever shown on reviews;
 * the email stays private). Then: rate with paw prints, add an optional comment.
 */
export default function ReviewSheet({
  place,
  open,
  profile,
  existing,
  onClose,
  onProfileCreated,
  onSaved,
  onDeleted,
}: Props) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [gif, setGif] = useState<ReviewGif | null>(existing?.gif ?? null)
  const [pickingGif, setPickingGif] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Move focus to the heading whenever the step changes.
  const step = profile ? 'review' : 'name'
  useEffect(() => {
    if (open) headingRef.current?.focus()
  }, [open, step])

  if (!open) return null

  async function saveName(e: FormEvent) {
    e.preventDefault()
    const parsed = DisplayNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your display name.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await dataClient.createProfile(parsed.data)
      if (result.kind === 'ok') onProfileCreated(result.profile)
      else if (result.kind === 'taken') setError('That name is taken. Try another one.')
      else setError(result.message)
    } catch {
      setError('Could not save your name. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function saveReview(e: FormEvent) {
    e.preventDefault()
    const parsed = NewReviewSchema.safeParse({
      place_id: place.id,
      rating: rating ?? 0,
      comment: comment.trim() || null,
      gif,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your review.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      onSaved(await dataClient.saveReview(parsed.data))
    } catch {
      setError('Could not save your review. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete your review of this place?')) return
    setBusy(true)
    try {
      await dataClient.deleteMyReview(place.id)
      onDeleted()
    } catch {
      setError('Could not delete your review. Please try again.')
    } finally {
      setBusy(false)
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
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
        className={sheetClass}
      >
        {step === 'name' ? (
          <form onSubmit={saveName} noValidate>
            <div className="flex items-start justify-between gap-3">
              <h2
                id="review-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl outline-none"
              >
                Choose a display name
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-full px-4 font-bold underline"
              >
                Cancel
              </button>
            </div>
            <p className="mt-2 rounded-2xl bg-teal-tint p-4">
              <b>Your email always stays private.</b> Reviews show only your display name,
              never your email address.
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold tracking-wide text-ink-soft uppercase">
                Display name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                autoComplete="nickname"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'review-error' : 'name-hint'}
                className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
              />
            </label>
            <p id="name-hint" className="mt-2 text-sm text-ink-soft">
              2 to 30 characters, and no @ sign. Names are unique, so someone else may
              have taken yours.
            </p>
            {error && (
              <p id="review-error" role="alert" className="mt-3 font-bold text-oxblood">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? 'Saving…' : 'Save name and continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={saveReview} noValidate>
            <div className="flex items-start justify-between gap-3">
              <h2
                id="review-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl outline-none"
              >
                {existing ? 'Edit your review' : 'Review this place'}
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
            <p className="mt-1 text-sm text-ink-soft">
              Posting as <b className="text-ink">{profile?.display_name}</b>. Your email
              is never shown.
            </p>

            <div className="mt-5">
              <PawRatingInput
                value={rating}
                onChange={(n) => {
                  setRating(n)
                  setError(null)
                }}
                invalid={!!error && rating === null}
                describedBy={error ? 'review-error' : undefined}
              />
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold tracking-wide text-ink-soft uppercase">
                Comment (optional)
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={COMMENT_MAX}
                placeholder="How was it for you and your dog?"
                className="w-full rounded-2xl border-2 border-line bg-card p-4 text-lg"
              />
            </label>
            <p className="mt-1 text-right font-mono text-xs text-ink-soft">
              {comment.length} / {COMMENT_MAX}
            </p>

            {giphyEnabled && (
              <div className="mt-4">
                {gif && (
                  <div className="mb-2 flex items-start gap-3">
                    <img
                      src={gif.url}
                      alt={gif.title || 'Your chosen GIF'}
                      referrerPolicy="no-referrer"
                      className="max-h-32 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setGif(null)}
                      className="min-h-11 rounded-full px-3 font-bold underline"
                    >
                      Remove GIF
                    </button>
                  </div>
                )}
                {!pickingGif && (
                  <button
                    type="button"
                    onClick={() => setPickingGif(true)}
                    className="min-h-12 w-full rounded-full border-2 border-ink px-6 font-bold"
                  >
                    {gif ? 'Choose a different GIF' : 'Add a GIF (optional)'}
                  </button>
                )}
                {pickingGif && (
                  <GifPicker
                    onPick={(g) => {
                      setGif(g)
                      setPickingGif(false)
                    }}
                    onCancel={() => setPickingGif(false)}
                  />
                )}
              </div>
            )}

            {error && (
              <p id="review-error" role="alert" className="mt-3 font-bold text-oxblood">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? 'Saving…' : existing ? 'Save changes' : 'Post review'}
            </button>
            {existing && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                className="mt-3 min-h-12 w-full rounded-full border-2 border-oxblood px-6 font-bold text-oxblood disabled:opacity-60"
              >
                Delete my review
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
