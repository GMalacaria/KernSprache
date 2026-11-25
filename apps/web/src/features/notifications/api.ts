import { i18n } from '../../i18n'
import { isIos, isStandalone } from '../../lib/pwa'
import { supabase } from '../../lib/supabase'

/** Hours of the day the reminder can be set to (whole hours: the server runs every hour). */
export const REMINDER_HOURS = Array.from({ length: 16 }, (_, i) => i + 7)

export type PushSupport = 'ready' | 'needs-install' | 'unsupported'

/** iOS only delivers push to a PWA added to the home screen; elsewhere the browser APIs must exist. */
export function pushSupport(): PushSupport {
  if (isIos() && !isStandalone()) return 'needs-install'
  const supported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  return supported ? 'ready' : 'unsupported'
}

export function notificationsBlocked(): boolean {
  return 'Notification' in window && Notification.permission === 'denied'
}

const SERVICE_WORKER_TIMEOUT_MS = 10_000

/** The active service worker, or an error instead of waiting forever when it never registers. */
async function registration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("L'app non è ancora pronta per le notifiche: ricarica la pagina e riprova.")), SERVICE_WORKER_TIMEOUT_MS),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/** The browser's current push subscription, if reminders are on for this device. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ready') return null
  // getRegistration (not ready): without a registered service worker there is simply no subscription.
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

function applicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** Asks for permission (call it from a click), subscribes this device and saves the reminder hour. */
export async function enableReminders(userId: string, hour: number): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(i18n.t('reminders.errors.denied', { ns: 'settings' }))

  const reg = await registration()
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''),
    }))
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error(i18n.t('reminders.errors.noSubscription', { ns: 'settings' }))

  const { error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
  })
  if (error) throw error
  await setReminderHour(userId, hour)
}

/** Saves the reminder hour together with the device time zone, so "19:00" means 19:00 where the learner is. */
export async function setReminderHour(userId: string, hour: number): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      reminder_time: `${String(hour).padStart(2, '0')}:00`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    .eq('id', userId)
  if (error) throw error
}

export async function disableReminders(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}
