import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export interface AuthState {
  /** Current Supabase session; `undefined` while the initial check is in flight. */
  session: Session | null | undefined
  /** The learner arrived from a password-reset link and must choose a new password. */
  recovering: boolean
  endRecovery: () => void
}

export function useAuthSession(): AuthState {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const endRecovery = useCallback(() => setRecovering(false), [])
  return { session, recovering, endRecovery }
}
