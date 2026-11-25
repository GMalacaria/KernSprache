import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

interface PendingApprovalPageProps {
  email: string | undefined
  checking: boolean
  onCheckAgain: () => void
}

/** The account exists but the owner has not approved it yet. */
export function PendingApprovalPage({ email, checking, onCheckAgain }: PendingApprovalPageProps) {
  const { t } = useTranslation(['auth', 'common'])
  return (
    <main className="page">
      <h1>{t('pending.title')}</h1>
      <p className="notice">
        {email ? t('pending.bodyWithEmail', { email }) : t('pending.body')}
      </p>
      <div className="stack">
        <button type="button" onClick={onCheckAgain} disabled={checking}>
          {checking ? t('pending.checking') : t('pending.checkAgain')}
        </button>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
          {t('common:actions.signOut')}
        </button>
      </div>
    </main>
  )
}
