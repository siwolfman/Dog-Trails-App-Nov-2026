import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { NewPasswordSchema } from '@/auth/credentials.ts'
import { useAuth } from '@/auth/useAuth.ts'
import AuthShell from '@/components/AuthShell.tsx'

/**
 * The page the emailed link opens. Supabase turns the link into a short-lived session, so a
 * signed-in user here is allowed to choose a new password. No session means the link is bad or old.
 */
export default function ResetPassword() {
  const { enabled, status, updatePassword, verifyRecovery } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Newer reset emails link here with a token that is only spent when the person presses the button,
  // so mail scanners that merely fetch the page cannot use it up.
  const tokenHash = params.get('token_hash')
  const [verified, setVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Choose a new password · Pawprint'
  }, [])

  async function confirmLink() {
    if (!tokenHash) return
    setError(null)
    setBusy(true)
    try {
      const problem = await verifyRecovery(tokenHash)
      if (problem) setError(problem)
      else {
        setVerified(true)
        navigate('/reset-password', { replace: true }) // drop the token from the address bar
      }
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = NewPasswordSchema.safeParse({ password, confirm })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your new password.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const problem = await updatePassword(parsed.data.password)
      if (problem) setError(problem)
      else setDone(true)
    } finally {
      setBusy(false)
    }
  }

  // Also wait after confirming a link, while the new session arrives.
  if (enabled && (status === 'loading' || (verified && status === 'signed_out'))) {
    return (
      <AuthShell>
        <p className="mt-4 font-mono text-ink-soft">Checking your link…</p>
      </AuthShell>
    )
  }

  if (enabled && tokenHash && !verified) {
    return (
      <AuthShell>
        <h1 className="mt-2 text-4xl">Reset your password</h1>
        <p className="mt-3 text-lg">
          Press the button to confirm and choose a new password.
        </p>
        {error && (
          <p role="alert" className="mt-4 font-bold text-oxblood">
            {error}{' '}
            <Link to="/forgot-password" className="underline">
              Request a new link
            </Link>
          </p>
        )}
        <button
          type="button"
          onClick={() => void confirmLink()}
          disabled={busy}
          className="mt-6 min-h-14 w-full rounded-full bg-ink px-6 text-lg font-bold text-card disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </AuthShell>
    )
  }

  if (!enabled || status === 'signed_out') {
    return (
      <AuthShell>
        <h1 className="mt-2 text-4xl">This link has expired.</h1>
        <p className="mt-3 text-lg">
          Reset links work once and only for a short time. Request a new one and use it
          right away.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-ink px-6 text-lg font-bold text-card no-underline"
        >
          Request a new link
        </Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell>
        <h1 className="mt-2 text-4xl">Password updated.</h1>
        <p className="mt-3 text-lg">You are signed in with your new password.</p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="mt-6 min-h-14 w-full rounded-full bg-ink px-6 text-lg font-bold text-card"
        >
          Continue to the app
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="mt-2 text-4xl">Choose a new password</h1>
      <p className="mt-2 text-lg text-ink-soft">At least 8 characters.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block font-bold">New password</span>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Confirm new password</span>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="size-5 accent-ink"
          />
          <span>Show passwords</span>
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
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  )
}
