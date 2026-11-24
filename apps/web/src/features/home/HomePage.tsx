import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { NotificationSettings } from '../notifications/NotificationSettings'
import { ChangePassword } from '../auth/ChangePassword'
import { purposeLabel } from '../onboarding/purposes'
import { useDueCount } from '../review/useDueCount'
import { GoalRing } from '../study/GoalRing'
import { MenuButton, SideMenu } from './SideMenu'
import { useStudyTimer } from '../study/useStudyTimer'
import { chapterAwaitingTest, nextLesson } from '../path/progress'
import { usePath } from '../path/usePath'
import { useProfile } from './useProfile'

interface HomePageProps {
  user: User
  onStartDialogue: (mode: DialogueMode) => void
  onStartReview: () => void
  onEditGoals: () => void
  onRetakePlacement: () => void
  onOpenPath: () => void
  onOpenLesson: (lessonId: number) => void
  onOpenTest: (chapterId: number) => void
  /** Present when the app can be installed on this device. */
  onInstall?: () => void
}

export function HomePage({
  user,
  onStartDialogue,
  onStartReview,
  onEditGoals,
  onRetakePlacement,
  onOpenPath,
  onOpenLesson,
  onOpenTest,
  onInstall,
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

  const [menuOpen, setMenuOpen] = useState(false)
  // Run a menu entry after the drawer has closed.
  const fromMenu = (action: () => void) => () => {
    setMenuOpen(false)
    action()
  }

  return (
    <main className="page">
      <header className="row">
        <h1>English Tutor</h1>
        <MenuButton onClick={() => setMenuOpen(true)} />
      </header>

      {profile.data && (
        <p className="profile-summary">
          Livello <strong>{profile.data.level}</strong> · {purposeLabel(profile.data.purpose)} · {goalMinutes} min al
          giorno
        </p>
      )}

      <GoalRing />
      <p className="muted goal-hint">
        {timer.status.goalReached
          ? 'Obiettivo di oggi raggiunto. Puoi continuare ad allenarti quanto vuoi.'
          : recommended === 'written'
            ? 'Prima metà: scritto (dialogo scritto e ripasso).'
            : 'Seconda metà: orale (dialogo a voce).'}
      </p>
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

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
        <nav className="side-menu-nav" aria-label="Sezioni">
          <button type="button" className="menu-item" onClick={fromMenu(onOpenPath)}>
            Percorso
          </button>
          <button type="button" className="menu-item" onClick={fromMenu(onEditGoals)}>
            Obiettivo e scopo
          </button>
          <button type="button" className="menu-item" onClick={fromMenu(onRetakePlacement)}>
            Rifai il test di livello
          </button>
          {onInstall && (
            <button type="button" className="menu-item" onClick={fromMenu(onInstall)}>
              Installa l'app
            </button>
          )}
        </nav>
        <NotificationSettings userId={user.id} />
        <div className="footer-links">
          <ChangePassword />
        </div>
        <button type="button" className="secondary menu-signout" onClick={() => void supabase.auth.signOut()}>
          Esci
        </button>
      </SideMenu>
    </main>
  )
}
