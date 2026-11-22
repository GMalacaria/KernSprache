import { useState } from 'react'
import { LoginPage } from './features/auth/LoginPage'
import { useAuthSession } from './features/auth/useAuthSession'
import { DialoguePage } from './features/dialogue/DialoguePage'
import { HomePage } from './features/home/HomePage'
import { InstallBanner } from './features/onboarding/InstallBanner'

type View = 'home' | 'dialogue'

export function App() {
  const session = useAuthSession()
  const [view, setView] = useState<View>('home')

  return (
    <>
      <InstallBanner />
      {session === undefined ? (
        <main className="page">
          <p>Caricamento…</p>
        </main>
      ) : session ? (
        view === 'dialogue' ? (
          <DialoguePage onExit={() => setView('home')} />
        ) : (
          <HomePage user={session.user} onStartDialogue={() => setView('dialogue')} />
        )
      ) : (
        <LoginPage />
      )}
    </>
  )
}
