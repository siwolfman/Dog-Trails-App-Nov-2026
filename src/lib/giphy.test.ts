import { afterEach, describe, expect, test, vi } from 'vitest'
import { ReviewGifSchema } from '@/data/schemas.ts'
import { gifFromId, gifStillUrl, searchGifs } from './giphy.ts'

afterEach(() => vi.unstubAllGlobals())

const reply = (body: unknown, ok = true, status = 200) =>
  vi.fn(async () => ({ ok, status, json: async () => body }))

describe('searchGifs', () => {
  test('asks GIPHY for G-rated results only', async () => {
    const fetchMock = reply({ data: [] })
    vi.stubGlobal('fetch', fetchMock)
    await searchGifs('happy dog', undefined, 'KEY123')
    const url = new URL(String((fetchMock.mock.calls as unknown[][])[0]?.[0]))
    expect(url.origin + url.pathname).toBe('https://api.giphy.com/v1/gifs/search')
    expect(url.searchParams.get('rating')).toBe('g')
    expect(url.searchParams.get('q')).toBe('happy dog')
    expect(url.searchParams.get('api_key')).toBe('KEY123')
    expect(url.searchParams.get('limit')).toBe('12')
  })

  test('stores a URL built from the id, never one copied from the response', async () => {
    vi.stubGlobal(
      'fetch',
      reply({
        data: [
          {
            id: 'abc123XYZ',
            title: 'Happy dog GIF',
            images: { fixed_width: { url: 'https://evil.example/x.gif' } },
          },
        ],
      }),
    )
    const gifs = await searchGifs('dog', undefined, 'K')
    expect(gifs).toEqual([
      {
        id: 'abc123XYZ',
        url: 'https://media.giphy.com/media/abc123XYZ/200w_d.gif',
        title: 'Happy dog GIF',
      },
    ])
    expect(ReviewGifSchema.safeParse(gifs[0]).success).toBe(true)
  })

  test('does nothing without a key or a query', async () => {
    const fetchMock = reply({ data: [] })
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchGifs('dog', undefined, '')).toEqual([])
    expect(await searchGifs('   ', undefined, 'K')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('throws on an HTTP error and on a malformed response', async () => {
    vi.stubGlobal('fetch', reply({}, false, 429))
    await expect(searchGifs('dog', undefined, 'K')).rejects.toThrow(/429/)
    vi.stubGlobal('fetch', reply({ data: [{ id: '../../evil', title: '' }] }))
    await expect(searchGifs('dog', undefined, 'K')).rejects.toThrow()
  })

  test('stored URLs pass the schema, and the grid uses the small still', () => {
    const gif = gifFromId('abc123XYZ', 'dog')
    expect(ReviewGifSchema.safeParse(gif).success).toBe(true)
    expect(gif.url).toMatch(/200w_d\.gif$/)
    expect(gifStillUrl(gif)).toBe('https://media.giphy.com/media/abc123XYZ/200w_s.gif')
  })

  test('gifFromId trims and caps the title', () => {
    expect(gifFromId('abc', `  ${'x'.repeat(300)}  `).title).toHaveLength(200)
  })
})
