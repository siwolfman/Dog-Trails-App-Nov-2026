import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ReviewGif } from '@/data/schemas.ts'
import { gifStillUrl, searchGifs } from '@/lib/giphy.ts'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; query: string; gifs: ReviewGif[] }

/** Search GIPHY and pick one GIF. Searches run only when the person presses Search. */
export default function GifPicker({
  onPick,
  onCancel,
}: {
  onPick: (gif: ReviewGif) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => abortRef.current?.abort()
  }, [])

  async function search() {
    const q = query.trim()
    if (!q) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ status: 'loading' })
    try {
      const gifs = await searchGifs(q, ctrl.signal)
      if (!ctrl.signal.aborted) setState({ status: 'done', query: q, gifs })
    } catch {
      if (!ctrl.signal.aborted) setState({ status: 'error' })
    }
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-line bg-card p-3">
      {/* Not a <form>: the picker sits inside the review form, and a nested form would submit it. */}
      <div role="search" className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search GIPHY</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void search()
              }
            }}
            placeholder="Search GIFs, e.g. happy dog"
            className="min-h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-lg"
          />
        </label>
        <button
          type="button"
          onClick={() => void search()}
          className="min-h-12 shrink-0 rounded-full border-2 border-ink bg-button px-5 font-bold text-ink"
        >
          Search
        </button>
      </div>

      <div aria-live="polite" className="mt-3">
        {state.status === 'loading' && (
          <p className="font-mono text-ink-soft">Searching…</p>
        )}
        {state.status === 'error' && (
          <p role="alert" className="font-bold text-oxblood">
            GIPHY could not be reached. Try again in a moment.
          </p>
        )}
        {state.status === 'done' && state.gifs.length === 0 && (
          <p>No GIFs found for &ldquo;{state.query}&rdquo;. Try another word.</p>
        )}
      </div>

      {state.status === 'done' && state.gifs.length > 0 && (
        <ul className="mt-2 grid list-none grid-cols-3 gap-2 p-0">
          {state.gifs.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onPick(g)}
                aria-label={`Use GIF: ${g.title || 'untitled'}`}
                className="block aspect-square w-full overflow-hidden rounded-xl border-2 border-line bg-sand p-0 has-[:focus-visible]:outline-3"
              >
                <img
                  src={gifStillUrl(g)}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink-soft">
        <span>Powered by GIPHY. Your search is sent to GIPHY.</span>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 shrink-0 rounded-full px-3 font-bold underline"
        >
          Close
        </button>
      </div>
    </div>
  )
}
