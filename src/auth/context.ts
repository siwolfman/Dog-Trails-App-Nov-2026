import { createContext } from 'react'

export type AuthStatus = 'loading' | 'signed_out' | 'signed_in'

export type SignUpResult =
  { kind: 'signed_in' } | { kind: 'confirm_email' } | { kind: 'error'; message: string }

export interface AuthContextValue {
  /** False when no backend is configured: there are no accounts and no login gate. */
  enabled: boolean
  status: AuthStatus
  email: string | null
  isAdmin: boolean
  /** True once the admin check has finished for the current session. */
  adminChecked: boolean
  signUp(email: string, password: string): Promise<SignUpResult>
  /** Resolves to an error message, or null on success. */
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

/** Default when no provider is mounted (local mode and most tests): no accounts, no gate. */
export const LOCAL_AUTH: AuthContextValue = {
  enabled: false,
  status: 'signed_in',
  email: null,
  isAdmin: false,
  adminChecked: true,
  signUp: async () => ({ kind: 'error', message: 'Accounts need the Supabase backend.' }),
  signIn: async () => 'Accounts need the Supabase backend.',
  signOut: async () => {},
}

export const AuthContext = createContext<AuthContextValue>(LOCAL_AUTH)
