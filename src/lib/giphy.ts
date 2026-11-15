import { z } from 'zod'
import type { ReviewGif } from '@/data/schemas.ts'

/**
 * GIPHY search for review GIFs. The key is public by design (it ships in the page code). With no key
 * the feature is off and the review form shows no GIF button.
 */
export const GIPHY_KEY: string =
  (import.meta.env.VITE_GIPHY_API_KEY as string | undefined) ?? ''
export const giphyEnabled = GIPHY_KEY.length > 0

/** Only G-rated GIFs: this is a public feed. */
export const GIF_RATING = 'g'
export const GIF_RESULT_LIMIT = 12

const ResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().regex(/^[A-Za-z0-9]{3,40}$/),
      title: z.string().default(''),
    }),
  ),
})

/**
 * The GIF is stored as a plain URL built from its id, never copied from the response, so the stored
 * value is always a GIPHY-hosted image and nothing else.
 *
 * `200w_d.gif` is GIPHY's 200px-wide "downsampled" animation: about 170 KB on average, against about
 * 1.2 MB for the full `200w.gif`. Reviews are read on phones, so the light one is used.
 */
export function gifFromId(id: string, title: string): ReviewGif {
  return {
    id,
    url: `https://media.giphy.com/media/${id}/200w_d.gif`,
    title: title.trim().slice(0, 200),
  }
}

/** A still frame (about 28 KB) used for the search grid, so 12 results cost about 0.3 MB, not 14. */
export function gifStillUrl(gif: ReviewGif): string {
  return gif.url.replace('/200w_d.gif', '/200w_s.gif')
}

export async function searchGifs(
  query: string,
  signal?: AbortSignal,
  apiKey: string = GIPHY_KEY,
): Promise<ReviewGif[]> {
  const q = query.trim()
  if (!apiKey || !q) return []
  const params = new URLSearchParams({
    api_key: apiKey,
    q,
    limit: String(GIF_RESULT_LIMIT),
    rating: GIF_RATING,
    lang: 'en',
  })
  const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`, {
    ...(signal ? { signal } : {}),
  })
  if (!res.ok) throw new Error(`GIPHY returned ${res.status}`)
  const parsed = ResponseSchema.parse(await res.json())
  return parsed.data.map((g) => gifFromId(g.id, g.title))
}
