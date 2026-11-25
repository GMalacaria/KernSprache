import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfile } from '../home/useProfile'
import {
  currentSubscription,
  disableReminders,
  enableReminders,
  notificationsBlocked,
  pushSupport,
  REMINDER_HOURS,
  setReminderHour,
} from './api'

/** Daily reminder: turn push notifications on or off on this device and pick the hour. */
export function NotificationSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const profile = useProfile(userId)
  const support = pushSupport()
  const subscription = useQuery({
    queryKey: ['push-subscription'],
    queryFn: async () => (await currentSubscription()) !== null,
    enabled: support === 'ready',
  })
  const savedHour = Number(profile.data?.reminder_time.split(':')[0] ?? 19)
  const [chosenHour, setChosenHour] = useState<number | null>(null)
  const hour = chosenHour ?? savedHour

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['push-subscription'] })
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
  }
  const enable = useMutation({ mutationFn: () => enableReminders(userId, hour), onSuccess: refresh })
  const disable = useMutation({ mutationFn: disableReminders, onSuccess: refresh })
  const changeHour = useMutation({ mutationFn: (h: number) => setReminderHour(userId, h), onSuccess: refresh })

  if (support === 'unsupported') {
    return (
      <section className="notice">
        <h2 className="small-heading">Promemoria</h2>
        <p className="muted">Questo browser non supporta le notifiche: attivale dall'app installata sul telefono.</p>
      </section>
    )
  }
  if (support === 'needs-install') {
    return (
      <section className="notice">
        <h2 className="small-heading">Promemoria</h2>
        <p className="muted">
          Su iPhone le notifiche funzionano solo con l'app installata: in Safari tocca <strong>Condividi</strong> e poi{' '}
          <strong>Aggiungi a Home</strong>, poi riapri l'app dalla Home.
        </p>
      </section>
    )
  }
  if (!profile.data || subscription.isPending) return null

  const hourSelect = (
    <label className="row">
      <span>Ora del promemoria</span>
      <select
        value={hour}
        onChange={(e) => {
          const next = Number(e.target.value)
          setChosenHour(next)
          if (subscription.data) changeHour.mutate(next)
        }}
      >
        {REMINDER_HOURS.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </label>
  )
  const error = enable.error ?? disable.error ?? changeHour.error

  return (
    <section className="notice stack">
      <h2 className="small-heading">Promemoria</h2>
      {subscription.data ? (
        <>
          <p className="muted">
            Ricevi al massimo una notifica al giorno, se non hai ancora raggiunto l'obiettivo.
          </p>
          {hourSelect}
          <button type="button" className="link" onClick={() => disable.mutate()} disabled={disable.isPending}>
            Disattiva i promemoria
          </button>
        </>
      ) : notificationsBlocked() ? (
        <p className="muted">Le notifiche sono bloccate nel browser: consentile dalle sue impostazioni per attivare i promemoria.</p>
      ) : (
        <>
          <p className="muted">Una notifica al giorno con ripassi in scadenza o serie a rischio.</p>
          {hourSelect}
          <button type="button" onClick={() => enable.mutate()} disabled={enable.isPending}>
            Attiva i promemoria
          </button>
        </>
      )}
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}
