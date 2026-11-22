import { useState } from 'react'
import { isIos, isStandalone } from '../../lib/pwa'

/**
 * Shown when the app runs in a browser tab. On iOS, push notifications only
 * work once the PWA is added to the home screen from Safari.
 */
export function InstallBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || isStandalone()) return null

  return (
    <aside className="banner" role="note">
      {isIos() ? (
        <p>
          Per ricevere le notifiche installa l'app: in Safari tocca <strong>Condividi</strong> e poi{' '}
          <strong>Aggiungi a Home</strong>.
        </p>
      ) : (
        <p>Installa l'app dal menu del browser per usarla a schermo intero e ricevere le notifiche.</p>
      )}
      <button type="button" className="link" onClick={() => setDismissed(true)}>
        Più tardi
      </button>
    </aside>
  )
}
