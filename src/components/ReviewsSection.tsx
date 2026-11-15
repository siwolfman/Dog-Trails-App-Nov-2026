import { useCallback, useEffect, useState } from 'react'
import { dataClient } from '@/data/index.ts'
import type { Place, Profile, Review } from '@/data/schemas.ts'
import { PawRating } from './PawRating.tsx'
import ReviewSheet from './ReviewSheet.tsx'

type Load =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; reviews: Review[]; profile: Profile | null }

export function summarize(reviews: Review[]): { count: number; average: number | null } {
  const visible = reviews.filter((r) => !r.hidden)
  if (visible.length === 0) return { count: 0, average: null }
  const sum = visible.reduce((s, r) => s + r.rating, 0)
  return { count: visible.length, average: sum / visible.length }
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function ReviewsSection({ place }: { place: Place }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([dataClient.listReviews(place.id), dataClient.getMyProfile()])
      .then(
        ([reviews, profile]) => live && setLoad({ status: 'ready', reviews, profile }),
      )
      .catch(() => live && setLoad({ status: 'error' }))
    return () => {
      live = false
    }
  }, [place.id])

  const close = useCallback(() => setOpen(false), [])

  if (load.status === 'loading') {
    return (
      <section aria-labelledby="reviews-title" className="mt-8">
        <h2 id="reviews-title" className="mb-3 text-2xl">
          Reviews
        </h2>
        <p className="font-mono text-ink-soft">Loading…</p>
      </section>
    )
  }
  if (load.status === 'error') {
    return (
      <section aria-labelledby="reviews-title" className="mt-8">
        <h2 id="reviews-title" className="mb-3 text-2xl">
          Reviews
        </h2>
        <p role="alert" className="rounded-2xl bg-card p-4">
          Reviews could not be loaded right now.
        </p>
      </section>
    )
  }

  const { reviews, profile } = load
  const mine = profile
    ? (reviews.find((r) => r.user_id === profile.user_id) ?? null)
    : null
  const { count, average } = summarize(reviews)

  return (
    <section aria-labelledby="reviews-title" className="mt-8">
      <h2 id="reviews-title" className="mb-3 text-2xl">
        Reviews
      </h2>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-card p-4">
        {average === null ? (
          <p className="text-lg font-bold">No ratings yet</p>
        ) : (
          <>
            <PawRating value={average} size={26} />
            <p className="text-lg">
              <b>{average.toFixed(1)}</b> out of 5
              <span className="text-ink-soft">
                {' '}
                · {count} {count === 1 ? 'review' : 'reviews'}
              </span>
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 min-h-14 w-full rounded-full border-2 border-ink bg-button text-lg font-bold text-ink"
      >
        {mine ? 'Edit your review' : 'Write a review'}
      </button>

      {reviews.length > 0 && (
        <ul className="mt-4 list-none space-y-3 p-0">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="font-display text-lg font-extrabold">
                  {r.display_name}
                  {profile && r.user_id === profile.user_id && (
                    <span className="ml-2 font-sans text-sm font-bold text-ink-soft">
                      (you)
                    </span>
                  )}
                </p>
                <PawRating value={r.rating} size={20} />
              </div>
              <p className="font-mono text-xs text-ink-soft">
                {dateFmt.format(new Date(r.created_at))}
              </p>
              {r.hidden && (
                <p className="mt-2 rounded-xl bg-amber-tint p-2 text-sm font-bold">
                  Hidden by a moderator. Only you can see this.
                </p>
              )}
              {r.comment && (
                <p className="mt-2 break-words whitespace-pre-wrap">{r.comment}</p>
              )}
              {r.gif && (
                <img
                  src={r.gif.url}
                  alt={r.gif.title || 'GIF added by the reviewer'}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="mt-3 max-h-56 rounded-xl"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Keyed so the form starts fresh each time it opens, from the latest saved review. */}
      <ReviewSheet
        key={`${open}-${mine?.id ?? 'new'}-${mine?.updated_at ?? ''}`}
        place={place}
        open={open}
        profile={profile}
        existing={mine}
        onClose={close}
        onProfileCreated={(p) => setLoad({ status: 'ready', reviews, profile: p })}
        onSaved={(saved) => {
          setLoad({
            status: 'ready',
            profile,
            reviews: [saved, ...reviews.filter((r) => r.id !== saved.id)],
          })
          setOpen(false)
        }}
        onDeleted={() => {
          setLoad({
            status: 'ready',
            profile,
            reviews: reviews.filter((r) => r.user_id !== profile?.user_id),
          })
          setOpen(false)
        }}
      />
    </section>
  )
}
