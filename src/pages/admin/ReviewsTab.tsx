import { useEffect, useState } from 'react'
import { PawRating } from '@/components/PawRating.tsx'
import { dataClient } from '@/data/index.ts'
import type { Place, Review } from '@/data/schemas.ts'

/** Moderation: hide a review so nobody but its author sees it, or show it again. */
export default function ReviewsTab({ places }: { places: Place[] }) {
  const [reviews, setReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    let live = true
    dataClient.listAllReviews().then((r) => live && setReviews(r))
    return () => {
      live = false
    }
  }, [])

  if (!reviews) return <p className="font-mono text-ink-soft">Loading…</p>
  if (reviews.length === 0) return <p className="text-lg">No reviews yet.</p>

  return (
    <ul className="list-none space-y-3 p-0">
      {reviews.map((r) => {
        const place = places.find((p) => p.id === r.place_id)
        return (
          <li
            key={r.id}
            className={`rounded-2xl border p-4 ${r.hidden ? 'border-dashed border-ink bg-sand' : 'border-line bg-card'}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg font-extrabold">
                {place?.name ?? r.place_id}
              </p>
              <p className="font-mono text-xs text-ink-soft">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-bold">{r.display_name}</span>
              <PawRating value={r.rating} size={18} />
            </p>
            {r.comment && (
              <p className="mt-1 break-words whitespace-pre-wrap">{r.comment}</p>
            )}
            {r.gif && (
              <img
                src={r.gif.url}
                alt={r.gif.title || 'GIF added by the reviewer'}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="mt-2 max-h-40 rounded-xl"
              />
            )}
            <div className="mt-3 flex items-center gap-3">
              {r.hidden && <span className="font-bold">Hidden</span>}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await dataClient.setReviewHidden(r.id, !r.hidden)
                  } catch {
                    window.alert('Could not update the review.')
                    return
                  }
                  setReviews(
                    (prev) =>
                      prev?.map((x) =>
                        x.id === r.id ? { ...x, hidden: !r.hidden } : x,
                      ) ?? prev,
                  )
                }}
                className="min-h-11 rounded-full border-2 border-ink bg-button px-4 font-bold text-ink"
              >
                {r.hidden ? 'Show review' : 'Hide review'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
