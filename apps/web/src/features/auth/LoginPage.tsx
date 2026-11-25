import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './messages'
import { MIN_PASSWORD_LENGTH } from './SetPasswordForm'

type Mode = 'login' | 'register' | 'forgot'

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
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

  const pending = submit.isPending ? t('login.pending') : t(`login.submit.${mode}`)

  return (
    <main className="page">
      <h1>{t('common:appName')}</h1>
      <h2 className="small-heading">{t(`login.title.${mode}`)}</h2>
      {mode === 'register' && (
        <p className="muted">{t('login.registerHint')}</p>
      )}
      {mode === 'forgot' && (
        <p className="muted">{t('login.forgotHint')}</p>
      )}

      {submit.data === 'reset-sent' ? (
        <p className="notice">{t('login.resetSent', { email })}</p>
      ) : submit.data === 'check-email' ? (
        <p className="notice">{t('login.checkEmail')}</p>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <label htmlFor="email">{t('login.email')}</label>
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
              <label htmlFor="password">{t('login.password')}</label>
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
            {t('login.haveAccount')}
          </button>
        )}
        {mode === 'login' && (
          <>
            <button type="button" className="link" onClick={() => switchTo('register')}>
              {t('login.noAccount')}
            </button>
            <button type="button" className="link" onClick={() => switchTo('forgot')}>
              {t('login.forgot')}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
