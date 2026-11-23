import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './messages'
import { MIN_PASSWORD_LENGTH } from './SetPasswordForm'

type Mode = 'login' | 'register' | 'forgot'

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = useMutation({
    mutationFn: async (): Promise<'signed-in' | 'check-email' | 'reset-sent'> => {
      const address = email.trim()
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: window.location.origin })
        if (error) throw new Error(authErrorMessage(error))
        return 'reset-sent'
      }
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email: address, password })
        if (error) throw new Error(authErrorMessage(error))
        // Without a session the project asks to confirm the email first.
        return data.session ? 'signed-in' : 'check-email'
      }
      const { error } = await supabase.auth.signInWithPassword({ email: address, password })
      if (error) throw new Error(authErrorMessage(error))
      return 'signed-in'
    },
  })

  function switchTo(next: Mode) {
    setMode(next)
    submit.reset()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submit.mutate()
  }

  const title = mode === 'register' ? 'Crea un account' : mode === 'forgot' ? 'Password dimenticata' : 'Accedi'
  const button = mode === 'register' ? 'Registrati' : mode === 'forgot' ? 'Inviami il link' : 'Accedi'
  const pending = submit.isPending ? 'Un attimo…' : button

  return (
    <main className="page">
      <h1>English Tutor</h1>
      <h2 className="small-heading">{title}</h2>
      {mode === 'register' && (
        <p className="muted">Dopo la registrazione l'account deve essere approvato prima di poter usare l'app.</p>
      )}
      {mode === 'forgot' && (
        <p className="muted">Ti mandiamo un link per scegliere una nuova password.</p>
      )}

      {submit.data === 'reset-sent' ? (
        <p className="notice">Controlla la posta: il link per cambiare la password è stato inviato a {email}.</p>
      ) : submit.data === 'check-email' ? (
        <p className="notice">Controlla la posta e conferma l'email: poi l'account potrà essere approvato.</p>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== 'forgot' && (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? MIN_PASSWORD_LENGTH : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}
          <button type="submit" disabled={submit.isPending}>
            {pending}
          </button>
          {submit.isError && <p className="error">{submit.error.message}</p>}
        </form>
      )}

      <div className="stack">
        {mode !== 'login' && (
          <button type="button" className="link" onClick={() => switchTo('login')}>
            Ho già un account: accedi
          </button>
        )}
        {mode === 'login' && (
          <>
            <button type="button" className="link" onClick={() => switchTo('register')}>
              Non hai un account? Registrati
            </button>
            <button type="button" className="link" onClick={() => switchTo('forgot')}>
              Password dimenticata?
            </button>
          </>
        )}
      </div>
    </main>
  )
}
