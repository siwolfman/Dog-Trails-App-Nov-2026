import type { Photo } from '@/data/schemas.ts'

/**
 * The place's real photo, filling the header area. The credit sits right under it: the photos are
 * free-licensed (Wikimedia Commons) and the licenses require crediting the author.
 */
export function PlacePhotoImage({ photo }: { photo: Photo }) {
  return (
    <img
      src={photo.src}
      alt={photo.alt}
      className="block h-full w-full object-cover"
      // The header is the first thing on the page: do not lazy-load it.
      fetchPriority="high"
    />
  )
}

export function PhotoCredit({ photo }: { photo: Photo }) {
  return (
    <p className="px-5 pt-2 text-xs text-ink-soft">
      Photo by {photo.credit}
      {' · '}
      {photo.license_url ? (
        <a
          href={photo.license_url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {photo.license}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        photo.license
      )}
      {' · '}
      <a
        href={photo.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Wikimedia Commons<span className="sr-only"> (opens in a new tab)</span>
      </a>
      {' · resized'}
    </p>
  )
}
