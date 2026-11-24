import { useState } from 'react'
import { setSoundsEnabled, soundsEnabled } from '../../lib/sounds'
import { supabase } from '../../lib/supabase'
import { ChangePassword } from '../auth/ChangePassword'
import { NotificationSettings } from '../notifications/NotificationSettings'
import { SideMenu } from './SideMenu'

export interface AppMenuActions {
  onGoHome: () => void
  onOpenPath: () => void
  onEditGoals: () => void
  onRetakePlacement: () => void
  /** Present when the app can be installed on this device. */
  onInstall?: () => void
}

interface AppMenuProps {
  open: boolean
  onClose: () => void
  userId: string
  /** The screen the menu is opened from. */
  current: 'home' | 'path'
  actions: AppMenuActions
}

/** The side menu of the hub screens (home and path): navigation, settings and sign-out. */
export function AppMenu({ open, onClose, userId, current, actions }: AppMenuProps) {
  const [sounds, setSounds] = useState(soundsEnabled)
  // Run an entry after the drawer has closed.
  const run = (action: () => void) => () => {
    onClose()
    action()
  }
  const item = (screen: 'home' | 'path', label: string, action: () => void) => (
    <button
      type="button"
      className="menu-item"
      aria-current={current === screen ? 'page' : undefined}
      onClick={current === screen ? onClose : run(action)}
    >
      {label}
    </button>
  )

  return (
    <SideMenu open={open} onClose={onClose}>
      <nav className="side-menu-nav" aria-label="Sezioni">
        {item('home', 'Home', actions.onGoHome)}
        {item('path', 'Percorso', actions.onOpenPath)}
        <button type="button" className="menu-item" onClick={run(actions.onEditGoals)}>
          Obiettivo e scopo
        </button>
        <button type="button" className="menu-item" onClick={run(actions.onRetakePlacement)}>
          Rifai il test di livello
        </button>
        {actions.onInstall && (
          <button type="button" className="menu-item" onClick={run(actions.onInstall)}>
            Installa l'app
          </button>
        )}
      </nav>
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
        Effetti sonori
        <span className="tag">{sounds ? 'Attivi' : 'Disattivati'}</span>
      </button>
      <NotificationSettings userId={userId} />
      <div className="footer-links">
        <ChangePassword />
      </div>
      <button type="button" className="secondary menu-signout" onClick={() => void supabase.auth.signOut()}>
        Esci
      </button>
    </SideMenu>
  )
}
