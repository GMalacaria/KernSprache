import { useState } from 'react'
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
  const [sounds, setSounds] = useState(soundsEnabled)

  return (
    <main className="page settings-page">
      <header className="sticky-header">
        <h1>Impostazioni</h1>
      </header>

      <NotificationSettings userId={userId} />

      <section className="notice">
        <h2 className="small-heading">Suoni</h2>
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
          Effetti sonori per risposte giuste e sbagliate
          <span className="tag">{sounds ? 'Attivi' : 'Disattivati'}</span>
        </button>
      </section>

      {onInstall && (
        <section className="notice stack">
          <h2 className="small-heading">App sul telefono</h2>
          <p className="muted">Installala per aprirla dalla schermata Home e ricevere i promemoria.</p>
          <button type="button" className="secondary" onClick={onInstall}>
            Installa l'app
          </button>
        </section>
      )}

      <section className="notice stack">
        <h2 className="small-heading">Account</h2>
        {email && <p className="muted">Accesso come {email}</p>}
        <div className="footer-links">
          <ChangePassword />
        </div>
        <button type="button" className="secondary" onClick={() => void supabase.auth.signOut()}>
          Esci
        </button>
      </section>
    </main>
  )
}
