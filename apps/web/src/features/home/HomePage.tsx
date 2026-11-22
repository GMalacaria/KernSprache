import type { User } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { useDueCount } from '../review/useDueCount'
import { updateDailyGoal } from '../study/api'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyTimer } from '../study/useStudyTimer'
import { GOAL_OPTIONS } from '../study/studyMath'
import { useProfile } from './useProfile'

interface HomePageProps {
  user: User
  onStartDialogue: (mode: DialogueMode) => void
  onStartReview: () => void
}

export function HomePage({ user, onStartDialogue, onStartReview }: HomePageProps) {
  const queryClient = useQueryClient()
  const profile = useProfile(user.id)
  const dueCount = useDueCount()
  const timer = useStudyTimer()

  const saveGoal = useMutation({
    mutationFn: (minutes: number) => updateDailyGoal(user.id, minutes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user.id] }),
  })

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

      {profile.isPending && <p>Caricamento…</p>}
      {profile.isError && <p className="error">Impossibile caricare il profilo.</p>}
      {profile.data && (
        <p>
          Livello attuale: <strong>{profile.data.level}</strong>
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

      <div className="stack">
        <button type="button" onClick={() => onStartDialogue(recommended)}>
          {recommended === 'oral' ? 'Inizia un dialogo a voce' : 'Inizia un dialogo'}
        </button>
        <button type="button" onClick={onStartReview}>
          Ripasso{dueCount.data !== undefined && ` (${dueCount.data} da fare)`}
        </button>
      </div>

      {goalMinutes !== undefined && (
        <label className="goal-setting">
          Obiettivo giornaliero
          <select
            value={goalMinutes}
            disabled={saveGoal.isPending}
            onChange={(e) => saveGoal.mutate(Number(e.target.value))}
          >
            {[...new Set([...GOAL_OPTIONS, goalMinutes])].sort((a, b) => a - b).map((m) => (
              <option key={m} value={m}>
                {m} minuti
              </option>
            ))}
          </select>
        </label>
      )}
      {saveGoal.isError && <p className="error">Non sono riuscito a salvare l'obiettivo.</p>}
      {goalMinutes !== undefined && timer.goalSeconds !== goalMinutes * 60 && (
        <p className="muted">Il nuovo obiettivo vale da domani: quello di oggi è già iniziato.</p>
      )}
    </main>
  )
}
