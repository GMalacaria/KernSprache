import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')

  const sendLink = useMutation({
    mutationFn: async (address: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    sendLink.mutate(email.trim())
  }

  return (
    <main className="page">
      <h1>English Tutor</h1>
      <p>Accedi con la tua email: ti mandiamo un link per entrare.</p>

      {sendLink.isSuccess ? (
        <p className="notice">Controlla la posta: il link di accesso è stato inviato a {email}.</p>
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
          <button type="submit" disabled={sendLink.isPending}>
            {sendLink.isPending ? 'Invio in corso…' : 'Inviami il link'}
          </button>
          {sendLink.isError && <p className="error">Invio non riuscito: {sendLink.error.message}</p>}
        </form>
      )}
    </main>
  )
}
