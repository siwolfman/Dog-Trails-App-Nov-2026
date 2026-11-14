import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { EmailSchema } from '@/auth/credentials.ts'
import { useAuth } from '@/auth/useAuth.ts'
import AuthShell from '@/components/AuthShell.tsx'

export default function ForgotPassword() {
  const { enabled, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Reset your password · Pawprint'
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = EmailSchema.safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const problem = await requestPasswordReset(parsed.data)
      if (problem) setError(problem)
      else setSentTo(parsed.data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {sentTo ? (
        <section aria-labelledby="forgot-title" className="mt-2">
          <h1 id="forgot-title" className="text-4xl">
            Check your email.
          </h1>
          {/* Same message whether or not the address has an account, so this page cannot be used
              to find out who has one. */}
          <p className="mt-3 text-lg">
            If there is an account for <b>{sentTo}</b>, we have sent a link to choose a
            new password. It can take a few minutes. Check your spam folder too.
          </p>
          <Link
            to="/login"
            className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-button px-6 text-lg font-bold text-ink no-underline"
          >
            Back to log in
          </Link>
        </section>
      ) : (
        <>
          <h1 id="forgot-title" className="mt-2 text-4xl">
            Reset your password
          </h1>
          <p className="mt-2 text-lg text-ink-soft">
            Enter your email and we will send you a link to choose a new password.
          </p>

          {!enabled && (
            <p className="mt-4 rounded-2xl border-2 border-dashed border-ink p-4">
              Password reset needs the Supabase backend, which is not configured.
            </p>
          )}

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block font-bold">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
              />
            </label>
            {error && (
              <p role="alert" className="font-bold text-oxblood">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !enabled}
              className="min-h-14 w-full rounded-full bg-button px-6 text-lg font-bold text-ink disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link to="/login" className="font-bold underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
