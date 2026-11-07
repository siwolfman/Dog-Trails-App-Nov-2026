import { useAuth } from '@/auth/useAuth.ts'

/** "Signed in as ..." with a sign-out button. Renders nothing when accounts are not enabled. */
export default function AccountBar({ className = '' }: { className?: string }) {
  const { enabled, status, email, signOut } = useAuth()
  if (!enabled || status !== 'signed_in') return null
  return (
    <div
      className={`flex items-center justify-between gap-3 text-sm text-ink-soft ${className}`}
    >
      <span className="min-w-0 truncate">
        Signed in as <b className="text-ink">{email}</b>
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-11 shrink-0 rounded-full border-2 border-ink px-4 font-bold text-ink"
      >
        Sign out
      </button>
    </div>
  )
}
