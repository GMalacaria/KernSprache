import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './messages'

export const MIN_PASSWORD_LENGTH = 8

/** New password with confirmation, for a signed-in learner (settings or after a reset link). */
export function SetPasswordForm({ onDone, submitLabel }: { onDone: () => void; submitLabel?: string }) {
  const { t } = useTranslation(['auth', 'common'])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(authErrorMessage(error))
    },
    onSuccess: onDone,
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMismatch(password !== confirm)
    if (password === confirm) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label htmlFor="new-password">{t('password.new', { min: MIN_PASSWORD_LENGTH })}</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <label htmlFor="confirm-password">{t('password.confirm')}</label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <button type="submit" disabled={save.isPending}>
        {save.isPending ? t('common:actions.saving') : (submitLabel ?? t('password.save'))}
      </button>
      {mismatch && <p className="error">{t('password.mismatch')}</p>}
      {save.isError && <p className="error">{save.error.message}</p>}
    </form>
  )
}
