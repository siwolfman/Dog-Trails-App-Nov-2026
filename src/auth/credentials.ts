import { z } from 'zod'

/** 72 bytes is bcrypt's limit, which Supabase Auth uses. */
export const CredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')),
  password: z
    .string()
    .min(8, 'Use at least 8 characters for your password.')
    .max(72, 'Passwords can be at most 72 characters.'),
})
export type Credentials = z.infer<typeof CredentialsSchema>

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
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message
}
