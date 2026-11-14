import { useMemo, useState } from 'react'
import { dataClient } from '@/data/index.ts'
import type { Place } from '@/data/schemas.ts'
import { MAX_PICKS, validatePicks, type DraftPick } from '@/lib/admin.ts'
import { formatDate, getDisplayRule, todayISO } from '@/lib/dogStatus.ts'
import { mondayOf, sundayOf, weekForNextSunday } from '@/lib/weeks.ts'

interface Props {
  places: Place[]
  initialWeek: string | null
  initialPicks: DraftPick[]
}

export default function PicksTab({ places, initialWeek, initialPicks }: Props) {
  const today = useMemo(() => todayISO(), [])
  const [week, setWeek] = useState(initialWeek ?? weekForNextSunday(today))
  const [picks, setPicks] = useState<DraftPick[]>(initialPicks)
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [adding, setAdding] = useState('')

  const nameOf = (id: string) => places.find((p) => p.id === id)?.name ?? 'Unknown place'
  const addable = places
    .filter((p) => !picks.some((x) => x.place_id === p.id))
    .filter((p) => getDisplayRule(p, today).state !== 'unverified')
    .sort((a, b) => a.name.localeCompare(b.name))

  const change = (next: DraftPick[]) => {
    setPicks(next)
    setSaved(false)
  }

  async function changeWeek(value: string) {
    if (!value) return
    const monday = mondayOf(value)
    setWeek(monday)
    const { picks: existing } = await dataClient.getSundayPicks(monday)
    setPicks(existing.map((p) => ({ place_id: p.place_id, note: p.note })))
    setErrors([])
    setSaved(false)
  }

  async function save() {
    const problems = validatePicks(picks, places, today)
    setErrors(problems)
    if (problems.length) return
    try {
      await dataClient.saveSundayPicks(week, picks)
      setSaved(true)
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Could not save the picks.'])
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= picks.length) return
    const next = [...picks]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    change(next)
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm font-bold tracking-wide text-ink-soft uppercase">
          Week (any date in the week)
        </span>
        <input
          type="date"
          value={week}
          onChange={(e) => void changeWeek(e.target.value)}
          className="min-h-12 rounded-xl border-2 border-line bg-card px-3 text-lg"
        />
      </label>
      <p className="mt-1 text-ink-soft">
        Week of {formatDate(week)}, for Sunday {formatDate(sundayOf(week))}
      </p>

      <ol className="mt-5 list-none space-y-3 p-0">
        {picks.map((p, i) => (
          <li key={p.place_id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-lg font-extrabold">
                {i + 1}. {nameOf(p.place_id)}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={`Move ${nameOf(p.place_id)} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="size-11 rounded-full border-2 border-line font-bold disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${nameOf(p.place_id)} down`}
                  disabled={i === picks.length - 1}
                  onClick={() => move(i, 1)}
                  className="size-11 rounded-full border-2 border-line font-bold disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${nameOf(p.place_id)}`}
                  onClick={() => change(picks.filter((x) => x.place_id !== p.place_id))}
                  className="size-11 rounded-full border-2 border-line font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <label className="mt-2 block">
              <span className="sr-only">Note for {nameOf(p.place_id)}</span>
              <textarea
                value={p.note}
                rows={2}
                maxLength={280}
                placeholder="One line on why this is worth the drive"
                onChange={(e) =>
                  change(
                    picks.map((x) =>
                      x.place_id === p.place_id ? { ...x, note: e.target.value } : x,
                    ),
                  )
                }
                className="w-full rounded-xl border-2 border-line bg-paper p-3"
              />
            </label>
          </li>
        ))}
      </ol>

      {picks.length < MAX_PICKS && (
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-bold tracking-wide text-ink-soft uppercase">
            Add a verified place
          </span>
          <select
            value={adding}
            onChange={(e) => {
              if (e.target.value)
                change([...picks, { place_id: e.target.value, note: '' }])
              setAdding('')
            }}
            className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-lg"
          >
            <option value="">Choose a place…</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="mt-4 list-disc space-y-1 pl-5 font-bold text-oxblood">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {saved && (
        <p role="status" className="mt-4 font-bold text-teal-deep">
          Saved. The Sunday picks page now shows this list.
        </p>
      )}

      <button
        type="button"
        onClick={() => void save()}
        className="mt-5 min-h-14 w-full rounded-full bg-button px-6 text-lg font-bold text-ink"
      >
        Save picks
      </button>
    </div>
  )
}
