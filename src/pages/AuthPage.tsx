import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { LoginSchema, SignupSchema } from '@/auth/credentials.ts'
import { useAuth } from '@/auth/useAuth.ts'
import Hero from '@/components/Hero.tsx'
import PasswordRules from '@/components/PasswordRules.tsx'

type Mode = 'login' | 'signup'

const COPY = {
  login: {
    title: 'Log in',
    lead: 'Welcome back. Pick up where you left off.',
    submit: 'Log in',
    busy: 'Logging in…',
    switchText: 'New here?',
    switchLink: 'Create an account',
    switchTo: '/signup',
  },
  signup: {
    title: 'Create your account',
    lead: 'Free. Just an email and a password.',
    submit: 'Create account',
    busy: 'Creating account…',
    switchText: 'Already have an account?',
    switchLink: 'Log in',
    switchTo: '/login',
  },
} as const

export default function AuthPage({ mode }: { mode: Mode }) {
  const { enabled, status, signIn, signUp } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const copy = COPY[mode]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${copy.title} · Pawprint`
  }, [copy.title])

  // Nothing to log in to without a backend, and a signed-in user has no business here.
  if (!enabled || status === 'signed_in') return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = (mode === 'login' ? LoginSchema : SignupSchema).safeParse({
      email,
      password,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your email and password.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        setError(await signIn(parsed.data.email, parsed.data.password))
      } else {
        const result = await signUp(parsed.data.email, parsed.data.password)
        if (result.kind === 'error') setError(result.message)
        else if (result.kind === 'confirm_email') setConfirmEmail(parsed.data.email)
        // 'signed_in': the auth state change redirects us.
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-12">
      <div className="h-32 overflow-hidden">
        <Hero />
      </div>

      <main className="px-5 pt-6">
        <p className="font-display text-xl font-extrabold text-teal">Pawprint</p>

        {confirmEmail ? (
          <section aria-labelledby="auth-title" className="mt-2">
            <h1 id="auth-title" className="text-4xl">
              Check your email.
            </h1>
            <p className="mt-3 text-lg">
              We sent a confirmation link to <b>{confirmEmail}</b>. Open it, then come
              back and log in.
            </p>
            <Link
              to="/login"
              replace
              className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-button px-6 text-lg font-bold text-ink no-underline"
            >
              Go to log in
            </Link>
          </section>
        ) : (
          <>
            <h1 id="auth-title" className="mt-2 text-4xl">
              {copy.title}
            </h1>
            <p className="mt-2 text-lg text-ink-soft">{copy.lead}</p>

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

              <div>
                <label className="block">
                  <span className="mb-1 block font-bold">Password</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={mode === 'signup' ? 'password-rules' : undefined}
                    className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
                  />
                </label>
                {mode === 'signup' && (
                  <PasswordRules id="password-rules" password={password} />
                )}
              </div>

              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="size-5 accent-ink"
                />
                <span>Show password</span>
              </label>

              {error && (
                <p role="alert" className="font-bold text-oxblood">
                  {error}
                </p>
              )}

              {mode === 'login' && (
                <p className="text-right">
                  <Link
                    to="/forgot-password"
                    className="font-bold underline underline-offset-4"
                  >
                    Forgot your password?
                  </Link>
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="min-h-14 w-full rounded-full bg-button px-6 text-lg font-bold text-ink disabled:opacity-60"
              >
                {busy ? copy.busy : copy.submit}
              </button>
            </form>

            <p className="mt-6 text-center">
              {copy.switchText}{' '}
              <Link
                to={copy.switchTo}
                replace
                state={{ from }}
                className="font-bold underline underline-offset-4"
              >
                {copy.switchLink}
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  )
}
