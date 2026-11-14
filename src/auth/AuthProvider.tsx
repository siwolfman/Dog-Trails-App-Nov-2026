import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/data/supabase.ts'
import {
  AuthContext,
  LOCAL_AUTH,
  type AuthContextValue,
  type AuthStatus,
  type SignUpResult,
} from './context.ts'
import { friendlyAuthError } from './credentials.ts'

interface Session {
  status: AuthStatus
  email: string | null
  isAdmin: boolean
  adminChecked: boolean
}

const LOADING: Session = {
  status: 'loading',
  email: null,
  isAdmin: false,
  adminChecked: false,
}

/**
 * Supabase Auth (email + password) for the whole app. With no Supabase config it provides the
 * "no accounts, no gate" value so local development still works.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(LOADING)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let live = true

    async function resolve(email: string | undefined) {
      if (!email) {
        if (live)
          setSession({
            status: 'signed_out',
            email: null,
            isAdmin: false,
            adminChecked: true,
          })
        return
      }
      // Signed in immediately; the admin check follows.
      if (live)
        setSession({ status: 'signed_in', email, isAdmin: false, adminChecked: false })
      const { data } = await sb!.rpc('is_admin')
      if (live)
        setSession({
          status: 'signed_in',
          email,
          isAdmin: data === true,
          adminChecked: true,
        })
    }

    sb.auth.getSession().then(({ data }) => resolve(data.session?.user.email))
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      // Do not call back into supabase from inside this callback.
      setTimeout(() => void resolve(s?.user.email), 0)
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      if (!supabase) return LOCAL_AUTH.signUp(email, password)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) return { kind: 'error', message: friendlyAuthError(error.message) }
      // With "Confirm email" on, Supabase returns the user but no session.
      return data.session ? { kind: 'signed_in' } : { kind: 'confirm_email' }
    },
    [],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return LOCAL_AUTH.signIn(email, password)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? friendlyAuthError(error.message) : null
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setSession({ status: 'signed_out', email: null, isAdmin: false, adminChecked: true })
  }, [])

  const requestPasswordReset = useCallback(
    async (email: string): Promise<string | null> => {
      if (!supabase) return LOCAL_AUTH.requestPasswordReset(email)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return error ? friendlyAuthError(error.message) : null
    },
    [],
  )

  const verifyRecovery = useCallback(
    async (tokenHash: string): Promise<string | null> => {
      if (!supabase) return LOCAL_AUTH.verifyRecovery(tokenHash)
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })
      return error ? friendlyAuthError(error.message) : null
    },
    [],
  )

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    if (!supabase) return LOCAL_AUTH.updatePassword(password)
    const { error } = await supabase.auth.updateUser({ password })
    return error ? friendlyAuthError(error.message) : null
  }, [])

  const value = useMemo<AuthContextValue>(
    () =>
      supabase
        ? {
            enabled: true,
            ...session,
            signUp,
            signIn,
            signOut,
            requestPasswordReset,
            verifyRecovery,
            updatePassword,
          }
        : LOCAL_AUTH,
    [
      session,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      verifyRecovery,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
