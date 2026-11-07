import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.ts'

export type AdminState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'not_admin'; email: string }
  | { status: 'admin'; email: string }

/**
 * Real admin auth: Supabase Auth (email + password) plus the `admins` table, checked by the
 * database itself through is_admin(). Row Level Security enforces it on every write, so the
 * UI check here only decides what to show.
 */
export function useSupabaseAdmin() {
  const [state, setState] = useState<AdminState>({ status: 'loading' })

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let live = true

    async function resolve(email: string | undefined) {
      if (!email) return live && setState({ status: 'signed_out' })
      const { data } = await sb!.rpc('is_admin')
      if (live) setState({ status: data === true ? 'admin' : 'not_admin', email })
    }

    sb.auth.getSession().then(({ data }) => resolve(data.session?.user.email))
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      // Defer: do not call back into supabase inside the auth callback.
      setTimeout(() => void resolve(session?.user.email), 0)
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setState({ status: 'signed_out' })
  }, [])

  return { state, signIn, signOut }
}
