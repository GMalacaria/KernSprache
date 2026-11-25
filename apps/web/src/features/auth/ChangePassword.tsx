import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SetPasswordForm } from './SetPasswordForm'

/** Collapsed section of the home screen: change the password while signed in. */
export function ChangePassword() {
  const { t } = useTranslation('auth')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  if (saved) return <p className="muted" style={{ flexBasis: '100%' }}>{t('password.changed')}</p>
  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        {t('password.change')}
      </button>
    )
  }
  return (
    <section className="notice">
      <h2 className="small-heading">{t('password.change')}</h2>
      <SetPasswordForm onDone={() => setSaved(true)} />
    </section>
  )
}
