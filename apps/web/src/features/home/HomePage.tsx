import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { purposeLabel } from '../onboarding/purposes'
import { useDueCount } from '../review/useDueCount'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyTimer } from '../study/useStudyTimer'
import { useProfile } from './useProfile'

interface HomePageProps {
  user: User
  onStartDialogue: (mode: DialogueMode) => void
  onStartReview: () => void
  onEditGoals: () => void
}

export function HomePage({ user, onStartDialogue, onStartReview, onEditGoals }: HomePageProps) {
  const profile = useProfile(user.id)
  const dueCount = useDueCount()
  const timer = useStudyTimer()
  const recommended = timer.status.recommendedMode
  const goalMinutes = profile.data?.daily_goal_minutes

  return (
    <main className="page">
      <header className="row">
        <h1>Ciao!</h1>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
          Esci
        </button>
      </header>

      {profile.data && (
        <p className="row profile-summary">
          <span>
            Livello <strong>{profile.data.level}</strong> · {purposeLabel(profile.data.purpose)} · {goalMinutes} min al
            giorno
          </span>
          <button type="button" className="link" onClick={onEditGoals}>
            Modifica
          </button>
        </p>
      )}

      <StudyTimerBar />
      <p className="muted">
        {timer.status.goalReached
          ? 'Obiettivo di oggi raggiunto. Puoi continuare ad allenarti quanto vuoi.'
          : recommended === 'written'
            ? 'Prima metà: scritto (dialogo scritto e ripasso).'
            : 'Seconda metà: orale (dialogo a voce).'}
      </p>
      {goalMinutes !== undefined && timer.ready && timer.goalSeconds !== goalMinutes * 60 && (
        <p className="muted">Il nuovo obiettivo di {goalMinutes} minuti vale da domani: quello di oggi è già iniziato.</p>
      )}

      <div className="stack">
        <button type="button" onClick={() => onStartDialogue(recommended)}>
          {recommended === 'oral' ? 'Inizia un dialogo a voce' : 'Inizia un dialogo'}
        </button>
        <button type="button" onClick={onStartReview}>
          Ripasso{dueCount.data !== undefined && ` (${dueCount.data} da fare)`}
        </button>
      </div>
    </main>
  )
}
