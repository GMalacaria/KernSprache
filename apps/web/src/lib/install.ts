import { useSyncExternalStore } from 'react'
import { isIos, isStandalone } from './pwa'

/**
 * Installing Kern Sprache on the phone's home screen.
 *
 * - Chromium browsers on Android fire `beforeinstallprompt` when the app can be installed:
 *   the event is kept and its `prompt()` opens the system dialog.
 * - iOS has no such API: the only way is Share > "Aggiungi alla schermata Home", so the app
 *   can only show instructions.
 *
 * Nothing is offered when the app already runs installed, or on devices without a touch
 * screen (desktop browsers have their own install button).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** `native`: the system install dialog is available; `ios`: only instructions. */
export type InstallMode = 'native' | 'ios' | null

const OFFERED_KEY = 'kernsprache.installOffered'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Called once before the first render: the event can fire very early. */
export function listenForInstall(): void {
  installed = isStandalone()
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keeps the browser's own mini-infobar away: the app offers installation itself, after sign-in.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    notify()
  })
}

function currentMode(): InstallMode {
  if (installed || !window.matchMedia('(pointer: coarse)').matches) return null
  if (deferred) return 'native'
  if (isIos()) return 'ios'
  return null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** How the app can be installed on this device right now, or null. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, currentMode, () => null)
}

/** Opens the system install dialog. True if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  // The event can be used only once.
  deferred = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}

/** The automatic offer appears once per device. */
export function wasOffered(): boolean {
  try {
    return localStorage.getItem(OFFERED_KEY) === '1'
  } catch {
    // Without storage it would come back on every visit: better never.
    return true
  }
}

export function markOffered(): void {
  try {
    localStorage.setItem(OFFERED_KEY, '1')
  } catch {
    // Nothing to do.
  }
}
