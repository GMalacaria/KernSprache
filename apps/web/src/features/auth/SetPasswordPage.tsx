import { useTranslation } from 'react-i18next'
import { SetPasswordForm } from './SetPasswordForm'

/** Shown after the learner opens the link of a password-reset email. */
export function SetPasswordPage({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('auth')
  return (
    <main className="page">
      <h1>{t('password.chooseNew')}</h1>
      <SetPasswordForm onDone={onDone} />
    </main>
  )
}
