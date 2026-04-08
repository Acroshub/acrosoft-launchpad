import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Returns the current authenticated Supabase user and session.
 * - `user`    → null while loading or not authenticated
 * - `loading` → true during initial session check
 */
export const useCurrentUser = () => {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Listen to auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading }
}

/**
 * Sign in with email and password.
 */
export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

/**
 * Sign out the current user.
 */
export const signOut = () => supabase.auth.signOut()
