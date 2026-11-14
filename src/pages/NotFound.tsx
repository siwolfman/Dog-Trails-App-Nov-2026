import { Link } from 'react-router'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-4xl">Nothing here.</h1>
      <p className="mt-2 text-ink-soft">That page does not exist yet.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-12 items-center rounded-full bg-button px-6 font-bold text-ink no-underline"
      >
        Back to the map
      </Link>
    </main>
  )
}
