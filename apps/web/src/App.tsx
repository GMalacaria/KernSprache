import { LoginPage } from './features/auth/LoginPage'
import { useAuthSession } from './features/auth/useAuthSession'
import { HomePage } from './features/home/HomePage'
import { InstallBanner } from './features/onboarding/InstallBanner'

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
        <HomePage user={session.user} />
      ) : (
        <LoginPage />
      )}
    </>
  )
}
