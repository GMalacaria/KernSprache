import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setSoundsEnabled, soundsEnabled } from '../../lib/sounds'
import { supabase } from '../../lib/supabase'
import { ChangePassword } from '../auth/ChangePassword'
import { NotificationSettings } from '../notifications/NotificationSettings'

interface SettingsPageProps {
  userId: string
  email?: string
  /** Present when the app can be installed on this device. */
  onInstall?: () => void
}

/** Settings tab: reminders, sounds, installing the app, password and sign-out. */
export function SettingsPage({ userId, email, onInstall }: SettingsPageProps) {
  const { t } = useTranslation(['settings', 'common'])
  const [sounds, setSounds] = useState(soundsEnabled)

  return (
    <main className="page settings-page">
      <header className="sticky-header">
        <h1>{t('title')}</h1>
      </header>

      <NotificationSettings userId={userId} />

      <section className="notice">
        <h2 className="small-heading">{t('sounds.title')}</h2>
        <button
          type="button"
          className="menu-item menu-toggle"
          role="switch"
          aria-checked={sounds}
          onClick={() => {
            setSounds(!sounds)
            setSoundsEnabled(!sounds)
          }}
        >
          {t('sounds.toggle')}
          <span className="tag">{sounds ? t('sounds.on') : t('sounds.off')}</span>
        </button>
      </section>

      {onInstall && (
        <section className="notice stack">
          <h2 className="small-heading">{t('install.title')}</h2>
          <p className="muted">{t('install.why')}</p>
          <button type="button" className="secondary" onClick={onInstall}>
            {t('install.button')}
          </button>
        </section>
      )}

      <section className="notice stack">
        <h2 className="small-heading">{t('account.title')}</h2>
        {email && <p className="muted">{t('account.signedInAs', { email })}</p>}
        <div className="footer-links">
          <ChangePassword />
        </div>
        <button type="button" className="secondary" onClick={() => void supabase.auth.signOut()}>
          {t('common:actions.signOut')}
        </button>
      </section>
    </main>
  )
}
