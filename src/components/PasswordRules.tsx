import { PASSWORD_RULES } from '@/auth/credentials.ts'

/**
 * Live checklist of the password rules. Met and unmet differ by icon and by words, not only color,
 * and the list is tied to the password field so screen readers announce it with the field.
 */
export default function PasswordRules({
  id,
  password,
}: {
  id: string
  password: string
}) {
  return (
    <ul
      id={id}
      aria-label="Password rules"
      className="mt-2 list-none space-y-1 p-0 text-sm"
    >
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.met(password)
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 ${ok ? 'font-bold' : 'text-ink-soft'}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`shrink-0 ${ok ? 'text-teal' : ''}`}
            >
              {ok ? (
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              ) : (
                <circle cx="12" cy="12" r="5" />
              )}
            </svg>
            <span>
              {rule.label}
              <span className="sr-only">{ok ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
