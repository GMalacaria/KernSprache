import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useDueCount } from '../review/useDueCount'
import { useProfile } from './useProfile'

interface HomePageProps {
  user: User
  onStartDialogue: () => void
  onStartReview: () => void
}

export function HomePage({ user, onStartDialogue, onStartReview }: HomePageProps) {
  const profile = useProfile(user.id)
  const dueCount = useDueCount()

  return (
    <main className="page">
      <header className="row">
        <h1>Ciao!</h1>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
          Esci
        </button>
      </header>

      {profile.isPending && <p>Caricamento…</p>}
      {profile.isError && <p className="error">Impossibile caricare il profilo.</p>}
      {profile.data && (
        <p>
          Livello attuale: <strong>{profile.data.level}</strong>
        </p>
      )}

      <div className="stack">
        <button type="button" onClick={onStartDialogue}>
          Inizia un dialogo
        </button>
        <button type="button" onClick={onStartReview}>
          Ripasso{dueCount.data !== undefined && ` (${dueCount.data} da fare)`}
        </button>
      </div>
    </main>
  )
}
