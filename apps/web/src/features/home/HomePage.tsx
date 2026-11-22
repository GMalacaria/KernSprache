import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useProfile } from './useProfile'

export function HomePage({ user, onStartDialogue }: { user: User; onStartDialogue: () => void }) {
  const profile = useProfile(user.id)

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

      <button type="button" onClick={onStartDialogue}>
        Inizia un dialogo
      </button>
    </main>
  )
}
