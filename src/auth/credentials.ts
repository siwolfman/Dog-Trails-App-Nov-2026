import { z } from 'zod'

/**
 * The password rules, in one place. They MUST match Supabase Auth > Sign In / Providers > Email
 * (minimum length 8, "lowercase, uppercase, digits and symbols"). If you change them there, change
 * them here: Supabase is what actually enforces them, this only gives people a clear message first.
 */
export const PASSWORD_MIN = 8
/** 72 bytes is bcrypt's limit, which Supabase Auth uses. */
export const PASSWORD_MAX = 72
/** The symbols Supabase counts, as listed in its own error message. */
export const PASSWORD_SYMBOLS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export interface PasswordRule {
  id: 'length' | 'lower' | 'upper' | 'digit' | 'symbol'
  /** Shown in the checklist. */
  label: string
  /** Used in "Your password still needs ...". */
  needs: string
  met(password: string): boolean
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN} characters`,
    needs: `at least ${PASSWORD_MIN} characters`,
    met: (p) => p.length >= PASSWORD_MIN,
  },
  {
    id: 'lower',
    label: 'A lowercase letter',
    needs: 'a lowercase letter',
    met: (p) => /[a-z]/.test(p),
  },
  {
    id: 'upper',
    label: 'An uppercase letter',
    needs: 'an uppercase letter',
    met: (p) => /[A-Z]/.test(p),
  },
  { id: 'digit', label: 'A number', needs: 'a number', met: (p) => /[0-9]/.test(p) },
  {
    id: 'symbol',
    label: 'A symbol, like ! or ?',
    needs: 'a symbol such as ! or ?',
    met: (p) => [...p].some((c) => PASSWORD_SYMBOLS.includes(c)),
  },
]

export const PASSWORD_SUMMARY =
  'At least 8 characters, with a lowercase letter, an uppercase letter, a number and a symbol.'

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.'))

/** For creating or changing a password: every rule applies. */
export const PasswordSchema = z
  .string()
  .max(PASSWORD_MAX, `Passwords can be at most ${PASSWORD_MAX} characters.`)
  .superRefine((p, ctx) => {
    const missing = PASSWORD_RULES.filter((r) => !r.met(p)).map((r) => r.needs)
    if (missing.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Your password still needs ${joinList(missing)}.`,
      })
    }
  })

/** Sign up. */
export const SignupSchema = z.object({ email: EmailSchema, password: PasswordSchema })
export type Signup = z.infer<typeof SignupSchema>

/**
 * Log in. Deliberately NOT the strength rules: accounts made before the rules existed must still be
 * able to log in, and the server is the one that checks the password.
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Enter your password.'),
})
export type Login = z.infer<typeof LoginSchema>

/** Turn Supabase Auth's error messages into plain language. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'That email and password do not match.'
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with that email already exists. Log in instead.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the link.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }
  if (m.includes('expired') || (m.includes('invalid') && m.includes('token'))) {
    return 'This link has expired or was already used. Request a new one.'
  }
  if (m.includes('same password') || m.includes('different from the old')) {
    return 'Choose a password you have not used for this account before.'
  }
  // Supabase's own wording when a password breaks the project's strength rules (or is a known leaked one).
  if (
    m.includes('should be at least') ||
    m.includes('should contain at least one character') ||
    m.includes('known to be weak') ||
    m.includes('weak password') ||
    m.includes('pwned')
  ) {
    return `That password is too weak. ${PASSWORD_SUMMARY}`
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message
}

export const NewPasswordSchema = z
  .object({
    password: PasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'The two passwords do not match.',
    path: ['confirm'],
  })
