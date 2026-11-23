import { SetPasswordForm } from './SetPasswordForm'

/** Shown after the learner opens the link of a password-reset email. */
export function SetPasswordPage({ onDone }: { onDone: () => void }) {
  return (
    <main className="page">
      <h1>Scegli una nuova password</h1>
      <SetPasswordForm submitLabel="Salva la password" onDone={onDone} />
    </main>
  )
}
