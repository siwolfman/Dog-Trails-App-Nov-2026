import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { dataClient } from '@/data/index.ts'
import type { Place, SundayPick } from '@/data/schemas.ts'
import { checkAdminPassword } from '@/lib/admin.ts'
import { backend } from '@/data/index.ts'
import { useSupabaseAdmin } from '@/data/useSupabaseAdmin.ts'
import EventsTab from './admin/EventsTab.tsx'
import PicksTab from './admin/PicksTab.tsx'
import ReportsTab from './admin/ReportsTab.tsx'

const SESSION_KEY = 'pawprint:admin'
const TABS = ['Sunday picks', 'Reports', 'Events'] as const
type Tab = (typeof TABS)[number]

function useNoIndex() {
  useEffect(() => {
    document.title = 'Admin · Pawprint'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const expected = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (checkAdminPassword(value, expected)) {
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* unlocked for this render only */
      }
      onUnlock()
    } else {
      setError(true)
    }
  }

  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-3xl">Admin</h1>
      {!expected ? (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-ink p-4">
          Set <code>VITE_ADMIN_PASSWORD</code> in <code>.env.local</code> (see{' '}
          <code>.env.example</code>), then restart the dev server.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4">
          <label className="block">
            <span className="mb-1 block font-bold">Password</span>
            <input
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(false)
              }}
              autoComplete="off"
              aria-invalid={error || undefined}
              className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-lg"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 font-bold text-oxblood">
              That password is not right.
            </p>
          )}
          <button
            type="submit"
            className="mt-4 min-h-14 w-full rounded-full bg-ink px-6 text-lg font-bold text-card"
          >
            Unlock
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-ink-soft">
        Placeholder gate: it ships in the page code, so it is not real security. Real
        protection arrives with Supabase Auth.
      </p>
    </main>
  )
}

function Panel({
  onLock,
  lockLabel = 'Lock',
}: {
  onLock: () => void
  lockLabel?: string
}) {
  const [tab, setTab] = useState<Tab>('Sunday picks')
  const [data, setData] = useState<{
    places: Place[]
    weekStart: string | null
    picks: SundayPick[]
  } | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([dataClient.listPlaces(), dataClient.getSundayPicks()]).then(
      ([places, { weekStart, picks }]) => live && setData({ places, weekStart, picks }),
    )
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Admin</h1>
        <div className="flex gap-2">
          <Link to="/" className="min-h-12 content-center font-bold underline">
            View app
          </Link>
          <button
            type="button"
            onClick={onLock}
            className="min-h-12 rounded-full border-2 border-ink px-4 font-bold"
          >
            {lockLabel}
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {backend === 'supabase'
          ? 'Changes are saved to your Supabase database.'
          : 'Changes are saved in this browser until the Supabase backend is connected.'}
      </p>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="mt-5 flex gap-2 overflow-x-auto"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-12 shrink-0 rounded-full border-2 px-5 font-bold ${tab === t ? 'border-ink bg-ink text-card' : 'border-line bg-card'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6">
        {!data ? (
          <p className="font-mono text-ink-soft">Loading…</p>
        ) : tab === 'Sunday picks' ? (
          <PicksTab
            places={data.places}
            initialWeek={data.weekStart}
            initialPicks={data.picks.map((p) => ({ place_id: p.place_id, note: p.note }))}
          />
        ) : tab === 'Reports' ? (
          <ReportsTab places={data.places} />
        ) : (
          <EventsTab />
        )}
      </div>
    </div>
  )
}

function SupabaseGate({
  onSignIn,
  notAdminEmail,
  onSignOut,
}: {
  onSignIn: (email: string, password: string) => Promise<string | null>
  notAdminEmail?: string
  onSignOut: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (notAdminEmail) {
    return (
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="text-3xl">Admin</h1>
        <p
          role="alert"
          className="mt-4 rounded-2xl border-2 border-dashed border-ink p-4"
        >
          Signed in as <b>{notAdminEmail}</b>, which is not an admin. Ask the project
          owner to add this account to the <code>admins</code> table.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 min-h-12 rounded-full border-2 border-ink px-6 font-bold"
        >
          Sign out
        </button>
      </main>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(await onSignIn(email.trim(), password))
    setBusy(false)
  }

  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-3xl">Admin</h1>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block font-bold">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-lg"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-lg"
          />
        </label>
        {error && (
          <p role="alert" className="font-bold text-oxblood">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-14 w-full rounded-full bg-ink px-6 text-lg font-bold text-card disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Admin accounts are created in the Supabase dashboard. Access is enforced by the
        database.
      </p>
    </main>
  )
}

function SupabaseAdmin() {
  const { state, signIn, signOut } = useSupabaseAdmin()
  if (state.status === 'loading') {
    return (
      <main className="mx-auto max-w-sm px-5 py-16">
        <p className="font-mono text-ink-soft">Loading…</p>
      </main>
    )
  }
  if (state.status === 'admin')
    return <Panel onLock={() => void signOut()} lockLabel="Sign out" />
  return (
    <SupabaseGate
      onSignIn={signIn}
      onSignOut={() => void signOut()}
      {...(state.status === 'not_admin' ? { notAdminEmail: state.email } : {})}
    />
  )
}

function LocalAdmin() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  })
  return unlocked ? (
    <Panel
      onLock={() => {
        try {
          window.sessionStorage.removeItem(SESSION_KEY)
        } catch {
          /* ignore */
        }
        setUnlocked(false)
      }}
    />
  ) : (
    <Gate onUnlock={() => setUnlocked(true)} />
  )
}

export default function Admin() {
  useNoIndex()
  return backend === 'supabase' ? <SupabaseAdmin /> : <LocalAdmin />
}
