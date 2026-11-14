import { vi } from 'vitest'
import { LOCAL_AUTH, type AuthContextValue } from '@/auth/context.ts'

/** An auth context value for tests: accounts enabled, signed out, every action a spy. */
export function authValue(over: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    ...LOCAL_AUTH,
    enabled: true,
    status: 'signed_out',
    email: null,
    isAdmin: false,
    adminChecked: true,
    signUp: vi.fn(async () => ({ kind: 'signed_in' as const })),
    signIn: vi.fn(async () => null),
    signOut: vi.fn(async () => {}),
    requestPasswordReset: vi.fn(async () => null),
    updatePassword: vi.fn(async () => null),
    ...over,
  }
}
