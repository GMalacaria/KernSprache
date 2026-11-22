import { useState } from 'react'
import { LoginPage } from './features/auth/LoginPage'
import { useAuthSession } from './features/auth/useAuthSession'
import { DialoguePage } from './features/dialogue/DialoguePage'
import { HomePage } from './features/home/HomePage'
import { ReviewPage } from './features/review/ReviewPage'
import { StudyTimerProvider } from './features/study/StudyTimerContext'
import type { DialogueMode } from './features/dialogue/DialoguePage'
import { InstallBanner } from './features/onboarding/InstallBanner'

type View = 'home' | 'dialogue' | 'review'

export function App() {
  const session = useAuthSession()
  const [view, setView] = useState<View>('home')
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('written')

  function openDialogue(mode: DialogueMode) {
    setDialogueMode(mode)
    setView('dialogue')
  }

  return (
    <>
      <InstallBanner />
      {session === undefined ? (
        <main className="page">
          <p>Caricamento…</p>
        </main>
      ) : session ? (
        <StudyTimerProvider userId={session.user.id}>
          {view === 'dialogue' ? (
            <DialoguePage initialMode={dialogueMode} onExit={() => setView('home')} />
          ) : view === 'review' ? (
            <ReviewPage onExit={() => setView('home')} onSwitchToOral={() => openDialogue('oral')} />
          ) : (
            <HomePage user={session.user} onStartDialogue={openDialogue} onStartReview={() => setView('review')} />
          )}
        </StudyTimerProvider>
      ) : (
        <LoginPage />
      )}
    </>
  )
}
