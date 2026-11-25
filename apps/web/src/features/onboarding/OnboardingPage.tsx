import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { GOAL_OPTIONS } from '../study/studyMath'
import { Emoji } from '../../components/Emoji'
import { PURPOSES, purposeHint, purposeLabel, type LearningPurpose } from './purposes'

interface OnboardingPageProps {
  userId: string
  initial?: { purpose: LearningPurpose | null; goal: string | null; dailyGoalMinutes: number }
  /** Editing from the home screen (vs. first run). */
  editing?: boolean
  onDone: () => void
}

const MAX_GOAL_CHARS = 200

/**
 * First-run questions: why the learner studies and how many minutes a day.
 * Onboarding ends after the placement test (or skipping it), which sets onboarded_at.
 */
export function OnboardingPage({ userId, initial, editing = false, onDone }: OnboardingPageProps) {
  const { t } = useTranslation(['onboarding', 'common'])
  const queryClient = useQueryClient()
  const [purpose, setPurpose] = useState<LearningPurpose | null>(initial?.purpose ?? null)
  const [details, setDetails] = useState(initial?.goal ?? '')
  const [minutes, setMinutes] = useState(initial?.dailyGoalMinutes ?? 20)

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          purpose,
          goal: details.trim() || null,
          daily_goal_minutes: minutes,
        })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      onDone()
    },
  })

  const chosen = PURPOSES.find((p) => p.value === purpose)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (purpose) save.mutate()
  }

  return (
    <main className="page">
      <h1>{editing ? t('editTitle') : t('welcome')}</h1>
      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="purpose">{t('purposeQuestion')}</label>
        <select
          id="purpose"
          value={purpose ?? ''}
          onChange={(e) => setPurpose(e.target.value as LearningPurpose)}
        >
          {purpose === null && (
            <option value="" disabled>
              {t('choosePurpose')}
            </option>
          )}
          {PURPOSES.map((p) => (
            <option key={p.value} value={p.value}>
              {purposeLabel(p.value)}
            </option>
          ))}
        </select>
        {chosen && (
          <p className="purpose-hint muted">
            <Emoji name={chosen.icon} size="1.5rem" />
            <span>{purposeHint(chosen.value)}</span>
          </p>
        )}

        <label htmlFor="details">{t('detailsLabel')}</label>
        <textarea
          id="details"
          rows={2}
          maxLength={MAX_GOAL_CHARS}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t('detailsPlaceholder')}
        />

        <label htmlFor="minutes">{t('minutesQuestion')}</label>
        <select id="minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {[...new Set([...GOAL_OPTIONS, minutes])].sort((a, b) => a - b).map((m) => (
            <option key={m} value={m}>
              {t('common:minutes', { count: m })}
            </option>
          ))}
        </select>
        <p className="muted">{t('halfSplit')}</p>

        <button type="submit" disabled={!purpose || save.isPending}>
          {editing ? t('common:actions.save') : t('common:actions.next')}
        </button>
        {editing && (
          <button type="button" className="link" onClick={onDone}>
            {t('common:actions.cancel')}
          </button>
        )}
        {save.isError && <p className="error">{t('common:errors.saveFailed')}</p>}
      </form>
    </main>
  )
}
