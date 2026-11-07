import { useEffect, useState } from 'react'
import { dataClient } from '@/data/index.ts'
import type { Place, Report } from '@/data/schemas.ts'

export default function ReportsTab({ places }: { places: Place[] }) {
  const [reports, setReports] = useState<Report[] | null>(null)

  useEffect(() => {
    let live = true
    dataClient.listReports().then((r) => live && setReports(r))
    return () => {
      live = false
    }
  }, [])

  if (!reports) return <p className="font-mono text-ink-soft">Loading…</p>
  if (reports.length === 0) return <p className="text-lg">No reports yet.</p>

  return (
    <ul className="list-none space-y-3 p-0">
      {reports.map((r) => {
        const place = places.find((p) => p.id === r.place_id)
        return (
          <li key={r.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg font-extrabold">
                {place?.name ?? r.place_id}
              </p>
              <p className="font-mono text-xs text-ink-soft">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <p className="mt-1 text-sm font-bold tracking-wide uppercase">
              {r.report_type.replace('_', ' ')}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
            <label className="mt-3 flex items-center gap-2">
              <span className="font-bold">Status</span>
              <select
                value={r.status}
                onChange={async (e) => {
                  const status = e.target.value as Report['status']
                  await dataClient.updateReportStatus(r.id, status)
                  setReports(
                    (prev) =>
                      prev?.map((x) => (x.id === r.id ? { ...x, status } : x)) ?? prev,
                  )
                }}
                className="min-h-11 rounded-xl border-2 border-line bg-paper px-3"
              >
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
