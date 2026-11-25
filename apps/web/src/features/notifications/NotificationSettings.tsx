import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('settings')
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
        <h2 className="small-heading">{t('reminders.title')}</h2>
        <p className="muted">{t('reminders.unsupported')}</p>
      </section>
    )
  }
  if (support === 'needs-install') {
    return (
      <section className="notice">
        <h2 className="small-heading">{t('reminders.title')}</h2>
        <p className="muted">
          <Trans t={t} i18nKey="reminders.needsInstall" components={{ strong: <strong /> }} />
        </p>
      </section>
    )
  }
  if (!profile.data || subscription.isPending) return null

  const hourSelect = (
    <label className="row">
      <span>{t('reminders.hour')}</span>
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
      <h2 className="small-heading">{t('reminders.title')}</h2>
      {subscription.data ? (
        <>
          <p className="muted">
            {t('reminders.activeHint')}
          </p>
          {hourSelect}
          <button type="button" className="link" onClick={() => disable.mutate()} disabled={disable.isPending}>
            {t('reminders.disable')}
          </button>
        </>
      ) : notificationsBlocked() ? (
        <p className="muted">{t('reminders.blocked')}</p>
      ) : (
        <>
          <p className="muted">{t('reminders.inactiveHint')}</p>
          {hourSelect}
          <button type="button" onClick={() => enable.mutate()} disabled={enable.isPending}>
            {t('reminders.enable')}
          </button>
        </>
      )}
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}
