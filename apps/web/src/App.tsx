import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { LoginPage } from './features/auth/LoginPage'
import { useAuthSession } from './features/auth/useAuthSession'
import { DialoguePage, type DialogueMode } from './features/dialogue/DialoguePage'
import { HomePage } from './features/home/HomePage'
import { useProfile } from './features/home/useProfile'
import { InstallBanner } from './features/onboarding/InstallBanner'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { PlacementTestPage } from './features/placement/PlacementTestPage'
import { ReviewPage } from './features/review/ReviewPage'
import { StudyTimerProvider } from './features/study/StudyTimerContext'

type View = 'home' | 'dialogue' | 'review' | 'settings' | 'placement'

export function App() {
  const session = useAuthSession()

  return (
    <>
      <InstallBanner />
      {session === undefined ? (
        <main className="page">
          <p>Caricamento…</p>
        </main>
      ) : session ? (
        <SignedInApp user={session.user} />
      ) : (
        <LoginPage />
      )}
    </>
  )
}

function SignedInApp({ user }: { user: User }) {
  const profile = useProfile(user.id)
  const [view, setView] = useState<View>('home')
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('written')

  function openDialogue(mode: DialogueMode) {
    setDialogueMode(mode)
    setView('dialogue')
  }

  if (profile.isPending) {
    return (
      <main className="page">
        <p>Caricamento…</p>
      </main>
    )
  }
  if (profile.isError) {
    return (
      <main className="page">
        <p className="error">Impossibile caricare il profilo. Ricarica la pagina.</p>
      </main>
    )
  }

  const initial = {
    purpose: profile.data.purpose,
    goal: profile.data.goal,
    dailyGoalMinutes: profile.data.daily_goal_minutes,
  }

  // First run: purpose and daily goal, then the placement test (or skip it).
  if (!profile.data.onboarded_at) {
    return profile.data.purpose ? (
      <PlacementTestPage userId={user.id} firstRun onDone={() => setView('home')} />
    ) : (
      <OnboardingPage userId={user.id} initial={initial} onDone={() => setView('home')} />
    )
  }

  return (
    <StudyTimerProvider userId={user.id}>
      {view === 'dialogue' ? (
        <DialoguePage initialMode={dialogueMode} onExit={() => setView('home')} />
      ) : view === 'review' ? (
        <ReviewPage onExit={() => setView('home')} onSwitchToOral={() => openDialogue('oral')} />
      ) : view === 'placement' ? (
        <PlacementTestPage userId={user.id} firstRun={false} onDone={() => setView('home')} />
      ) : view === 'settings' ? (
        <OnboardingPage userId={user.id} initial={initial} editing onDone={() => setView('home')} />
      ) : (
        <HomePage
          user={user}
          onStartDialogue={openDialogue}
          onStartReview={() => setView('review')}
          onEditGoals={() => setView('settings')}
          onRetakePlacement={() => setView('placement')}
        />
      )}
    </StudyTimerProvider>
  )
}
