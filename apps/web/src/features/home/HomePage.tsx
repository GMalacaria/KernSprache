import type { User } from '@supabase/supabase-js'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { purposeLabel } from '../onboarding/purposes'
import { useDueCount } from '../review/useDueCount'
import { GoalRing } from '../study/GoalRing'
import { useStudyTimer } from '../study/useStudyTimer'
import { chapterAwaitingTest, nextLesson } from '../path/progress'
import { usePath } from '../path/usePath'
import { useProfile } from './useProfile'

interface HomePageProps {
  user: User
  onStartDialogue: (mode: DialogueMode) => void
  onStartReview: () => void
  onOpenLesson: (lessonId: number) => void
  onOpenTest: (chapterId: number) => void
}

export function HomePage({
  user,
  onStartDialogue,
  onStartReview,
  onOpenLesson,
  onOpenTest,
}: HomePageProps) {
  const profile = useProfile(user.id)
  const dueCount = useDueCount()
  const timer = useStudyTimer()
  const recommended = timer.status.recommendedMode
  const { path } = usePath(user.id)
  const next = path ? nextLesson(path) : null
  const testChapter = path ? chapterAwaitingTest(path) : null
  const goalMinutes = profile.data?.daily_goal_minutes
  // With no lesson or test to continue, the dialogue becomes the main action.
  const hasMainAction = Boolean(next || testChapter)
  const secondary = 'secondary'

  return (
    <main className="page home">
      <header>
        <h1>Kern Sprache</h1>
      </header>

      {profile.data && (
        <p className="profile-summary">
          Livello <strong>{profile.data.level}</strong> · {purposeLabel(profile.data.purpose)} · {goalMinutes} min al
          giorno
        </p>
      )}

      <GoalRing />
      {timer.status.goalReached && (
        <p className="muted goal-hint">Obiettivo di oggi raggiunto. Puoi continuare ad allenarti quanto vuoi.</p>
      )}
      {goalMinutes !== undefined && timer.ready && timer.goalSeconds !== goalMinutes * 60 && (
        <p className="muted goal-hint">
          Il nuovo obiettivo di {goalMinutes} minuti vale da domani: quello di oggi è già iniziato.
        </p>
      )}

      <div className="home-actions">
        {next ? (
          <button type="button" className="primary-action" onClick={() => onOpenLesson(next.lesson.id)}>
            Continua il percorso: {next.lesson.title}
            <small>
              {next.chapter.level} · {next.chapter.title}
            </small>
          </button>
        ) : (
          testChapter && (
            <button type="button" className="primary-action" onClick={() => onOpenTest(testChapter.id)}>
              Verifica del capitolo: {testChapter.title}
              <small>{testChapter.level} · scritto e orale, per passare al capitolo successivo</small>
            </button>
          )
        )}
        <button type="button" className={hasMainAction ? secondary : undefined} onClick={() => onStartDialogue(recommended)}>
          {recommended === 'oral' ? 'Inizia un dialogo a voce' : 'Inizia un dialogo'}
        </button>
        <button type="button" className={secondary} onClick={onStartReview}>
          Ripasso{dueCount.data !== undefined && ` (${dueCount.data} da fare)`}
        </button>
      </div>

    </main>
  )
}
