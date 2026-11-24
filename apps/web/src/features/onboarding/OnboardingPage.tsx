import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { GOAL_OPTIONS } from '../study/studyMath'
import { Emoji } from '../../components/Emoji'
import { PURPOSES, type LearningPurpose } from './purposes'

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

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (purpose) save.mutate()
  }

  return (
    <main className="page">
      <h1>{editing ? 'I tuoi obiettivi' : 'Benvenuto!'}</h1>
      <form onSubmit={onSubmit} className="stack">
        <fieldset className="purposes">
          <legend>Perché vuoi imparare l'inglese?</legend>
          {PURPOSES.map((p) => (
            <label key={p.value} className={`purpose${purpose === p.value ? ' selected' : ''}`}>
              <input
                type="radio"
                name="purpose"
                value={p.value}
                checked={purpose === p.value}
                onChange={() => setPurpose(p.value)}
              />
              <span className="purpose-icon" aria-hidden="true">
                <Emoji name={p.icon} size="1.75rem" />
              </span>
              <span>
                <strong>{p.label}</strong>
                <small>{p.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <label htmlFor="details">Vuoi aggiungere qualcosa? (facoltativo)</label>
        <textarea
          id="details"
          rows={2}
          maxLength={MAX_GOAL_CHARS}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Es. tra sei mesi mi trasferisco a Londra per lavoro"
        />

        <label htmlFor="minutes">Quanti minuti vuoi studiare al giorno?</label>
        <select id="minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {[...new Set([...GOAL_OPTIONS, minutes])].sort((a, b) => a - b).map((m) => (
            <option key={m} value={m}>
              {m} minuti
            </option>
          ))}
        </select>
        <p className="muted">Metà del tempo è scritto, metà orale.</p>

        <button type="submit" disabled={!purpose || save.isPending}>
          {editing ? 'Salva' : 'Avanti'}
        </button>
        {editing && (
          <button type="button" className="link" onClick={onDone}>
            Annulla
          </button>
        )}
        {save.isError && <p className="error">Non sono riuscito a salvare. Riprova.</p>}
      </form>
    </main>
  )
}
