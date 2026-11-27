import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { GOAL_OPTIONS } from '../study/studyMath'
import { Emoji } from '../../components/Emoji'
import { BackHeader } from '../../components/BackHeader'
import { PURPOSES, purposeHint, purposeLabel, type LearningPurpose } from './purposes'
import { useLanguageNames } from '../languages/useLanguage'
import { useSwitchLanguage } from '../languages/useLanguageSwitch'
import { STUDIED_LANGUAGES, type StudiedLanguage } from '../languages/languages'

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
  const names = useLanguageNames()
  // First access: switching here also moves to a language already set up (the app then leaves onboarding).
  const switchTo = useSwitchLanguage()
  const [purpose, setPurpose] = useState<LearningPurpose | null>(initial?.purpose ?? null)
  const [details, setDetails] = useState(initial?.goal ?? '')
  const [minutes, setMinutes] = useState(initial?.dailyGoalMinutes ?? 20)

  const save = useMutation({
    mutationFn: async () => {
      // The daily goal is one for all languages; purpose and details belong to the studied language.
      const [profile, language] = await Promise.all([
        supabase.from('profiles').update({ daily_goal_minutes: minutes }).eq('id', userId),
        supabase
          .from('learner_languages')
          .upsert({ user_id: userId, language: names.code, purpose, goal: details.trim() || null }),
      ])
      if (profile.error) throw profile.error
      if (language.error) throw language.error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await queryClient.invalidateQueries({ queryKey: ['learner-languages'] })
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
      {editing ? <BackHeader title={t('editTitle')} onBack={onDone} /> : <h1>{t('welcome')}</h1>}
      <form onSubmit={onSubmit} className="stack">
        {!editing && (
          <>
            <label htmlFor="language">{t('languageQuestion')}</label>
            <select
              id="language"
              value={names.code}
              disabled={switchTo.isPending}
              onChange={(e) => switchTo.mutate(e.target.value as StudiedLanguage)}
            >
              {STUDIED_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {t(`common:languages.${code}.name`)}
                </option>
              ))}
            </select>
            <p className="muted">{t('languageHint')}</p>
          </>
        )}
        <label htmlFor="purpose">{t('purposeQuestion', { language: names.the })}</label>
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
        {save.isError && <p className="error">{t('common:errors.saveFailed')}</p>}
      </form>
    </main>
  )
}
