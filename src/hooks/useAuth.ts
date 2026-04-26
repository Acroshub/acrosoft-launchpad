import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { CrmStaff } from '@/lib/supabase'
import { buildPermChecker, visibleNavItems, getAllowedItemIds, canAccessItem } from '@/lib/permissions'
import type { Section, Action } from '@/lib/permissions'

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
 * Resolves whether the current user is a staff member and returns their
 * permission checker.
 *
 * - `isStaff`      → true if logged-in user appears in crm_staff
 * - `staffRecord`  → the crm_staff row (null if not staff)
 * - `can(section, action)` → permission check (always true for principals)
 * - `navItems`     → Set of nav ids visible to this user
 * - `ownerUserId`  → the principal's user_id this staff member belongs to
 */
export const useStaffPermissions = () => {
  const { user } = useCurrentUser()
  const [staffRecord, setStaffRecord] = useState<CrmStaff | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('crm_staff')
      .select('*')
      .eq('staff_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        setStaffRecord((data as CrmStaff) ?? null)
        setLoading(false)
      })
  }, [user?.id])

  const can = (section: Section, action: Action) =>
    buildPermChecker(staffRecord)(section, action)

  const allowedIds = (section: "calendarios" | "formularios" | "pipeline") =>
    getAllowedItemIds(staffRecord, section)

  const canItem = (section: "calendarios" | "formularios" | "pipeline", itemId: string, action: "read" | "edit") =>
    canAccessItem(staffRecord, section, itemId, action)

  return {
    isStaff:     staffRecord !== null,
    staffRecord,
    ownerUserId: staffRecord?.owner_user_id ?? user?.id ?? null,
    can,
    allowedIds,
    canItem,
    navItems:    visibleNavItems(staffRecord),
    loading,
  }
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

/**
 * Update the current user's password.
 */
export const updatePassword = (newPassword: string) =>
  supabase.auth.updateUser({ password: newPassword })
