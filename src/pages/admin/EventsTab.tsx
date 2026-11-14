import { useEffect, useState } from 'react'
import { dataClient } from '@/data/index.ts'
import { EVENT_NAMES, type AppEvent } from '@/data/schemas.ts'
import { countByName, eventsToCSV } from '@/lib/admin.ts'

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function EventsTab() {
  const [events, setEvents] = useState<AppEvent[] | null>(null)

  useEffect(() => {
    let live = true
    dataClient.listEvents().then((e) => live && setEvents(e))
    return () => {
      live = false
    }
  }, [])

  if (!events) return <p className="font-mono text-ink-soft">Loading…</p>
  const counts = countByName(events)

  return (
    <div>
      <p className="text-ink-soft">
        Stored in this browser for now. Events carry no cookies, IP address or account.
        When the Supabase backend arrives they land in the <code>events</code> table
        instead.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {EVENT_NAMES.map((n) => (
          <div key={n} className="rounded-2xl border border-line bg-card p-3">
            <dt className="font-mono text-xs text-ink-soft">{n}</dt>
            <dd className="font-display text-2xl font-extrabold">{counts[n] ?? 0}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            download(
              'pawprint-events.json',
              JSON.stringify(events, null, 2),
              'application/json',
            )
          }
          className="min-h-12 rounded-full border-2 border-ink bg-button px-5 font-bold"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => download('pawprint-events.csv', eventsToCSV(events), 'text/csv')}
          className="min-h-12 rounded-full border-2 border-ink bg-button px-5 font-bold"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={async () => {
            if (window.confirm('Delete all logged events in this browser?')) {
              await dataClient.clearEvents()
              setEvents([])
            }
          }}
          className="min-h-12 rounded-full border-2 border-oxblood px-5 font-bold text-oxblood"
        >
          Clear
        </button>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 text-lg">No events yet. Browse the app, then come back.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink font-mono text-xs uppercase">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Place</th>
                <th className="py-2">Properties</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 200).map((e) => (
                <tr key={e.id} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-3 font-bold">{e.event_name}</td>
                  <td className="py-2 pr-3">{e.place_id ?? '-'}</td>
                  <td className="py-2 font-mono text-xs">
                    {JSON.stringify(e.properties)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length > 200 && (
            <p className="mt-2 text-sm text-ink-soft">
              Showing the latest 200 of {events.length}. Export for all.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
