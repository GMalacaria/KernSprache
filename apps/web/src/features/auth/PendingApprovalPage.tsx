import { supabase } from '../../lib/supabase'

interface PendingApprovalPageProps {
  email: string | undefined
  checking: boolean
  onCheckAgain: () => void
}

/** The account exists but the owner has not approved it yet. */
export function PendingApprovalPage({ email, checking, onCheckAgain }: PendingApprovalPageProps) {
  return (
    <main className="page">
      <h1>Account in attesa</h1>
      <p className="notice">
        Il tuo account{email ? ` (${email})` : ''} è stato creato, ma deve essere approvato prima di poter usare
        l'app. Riprova più tardi.
      </p>
      <div className="stack">
        <button type="button" onClick={onCheckAgain} disabled={checking}>
          {checking ? 'Controllo…' : 'Controlla di nuovo'}
        </button>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
          Esci
        </button>
      </div>
    </main>
  )
}
