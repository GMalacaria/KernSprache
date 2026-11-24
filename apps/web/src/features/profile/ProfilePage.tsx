import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppMenu, type AppMenuActions } from '../home/AppMenu'
import { MenuButton } from '../home/SideMenu'
import { useProfile } from '../home/useProfile'
import { purposeLabel } from '../onboarding/purposes'
import { summarizeStats } from '../lesson/stats'
import { usePath } from '../path/usePath'
import { localDay } from '../study/studyMath'
import { Waiting } from '../../components/Waiting'
import { fetchProfileData } from './api'
import {
  bestGoalStreak,
  formatDuration,
  goalStreak,
  lastDaysMinutes,
  levelProgress,
  studiedDays,
  totalStudySeconds,
} from './profileStats'

const WEEKDAYS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <li>
      <strong>{value}</strong>
      <small>{label}</small>
    </li>
  )
}

/** The learner's profile: level and purpose, streaks, study time, answers and progress through the path. */
export function ProfilePage({ userId, menu }: { userId: string; menu: AppMenuActions }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const profile = useProfile(userId)
  const { path } = usePath(userId)
  const data = useQuery({ queryKey: ['profile-data'], queryFn: fetchProfileData })

  const today = localDay(profile.data?.timezone ?? 'Europe/Rome')
  const days = data.data?.days ?? []
  const answers = summarizeStats(data.data?.lessonStats ?? [])
  const bars = lastDaysMinutes(days, today)
  const maxMinutes = Math.max(15, ...bars.map((b) => b.minutes))
  const hasStudied = days.length > 0 || answers.lessons > 0

  return (
    <main className="page profile">
      <header className="row sticky-header">
        <h1>Profilo</h1>
        <MenuButton onClick={() => setMenuOpen(true)} />
      </header>

      {profile.data && (
        <section className="profile-hero">
          <p className="level-badge" aria-label={`Livello ${profile.data.level}`}>
            {profile.data.level}
          </p>
          <p>
            {purposeLabel(profile.data.purpose)} · {profile.data.daily_goal_minutes} min al giorno
          </p>
          {profile.data.goal && <p className="muted">«{profile.data.goal}»</p>}
          <button type="button" className="link" onClick={menu.onEditGoals}>
            Modifica obiettivo e scopo
          </button>
        </section>
      )}

      {data.isPending && <Waiting title="Conto i tuoi progressi" compact />}
      {data.isError && <p className="error">Non riesco a caricare i tuoi numeri. Riprova tra poco.</p>}

      {data.isSuccess && !hasStudied && (
        <p className="notice">Completa la prima lezione o raggiungi l'obiettivo di un giorno: i tuoi numeri compaiono qui.</p>
      )}

      {data.isSuccess && hasStudied && (
        <>
          <section>
            <h2>Costanza</h2>
            <ul className="stats-grid stats-grid-4">
              <Stat value={goalStreak(days, today)} label="giorni di fila" />
              <Stat value={bestGoalStreak(days)} label="record di giorni" />
              <Stat value={studiedDays(days)} label="giorni di studio" />
              <Stat value={formatDuration(totalStudySeconds(days))} label="tempo totale" />
            </ul>
            <ol className="day-bars" aria-label="Minuti studiati negli ultimi 14 giorni">
              {bars.map((bar) => (
                <li key={bar.day} title={`${bar.day}: ${bar.minutes} min`}>
                  <span className="day-bar" style={{ height: `${Math.max(3, (bar.minutes / maxMinutes) * 100)}%` }} />
                  <small>{WEEKDAYS[new Date(`${bar.day}T12:00:00Z`).getUTCDay()]}</small>
                  <span className="visually-hidden">{bar.minutes} minuti</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2>Risposte</h2>
            <ul className="stats-grid stats-grid-4">
              <Stat value={answers.lessons} label={answers.lessons === 1 ? 'lezione' : 'lezioni'} />
              <Stat value={answers.successRate === null ? '–' : `${answers.successRate}%`} label="risposte giuste" />
              <Stat value={answers.mistakes} label={answers.mistakes === 1 ? 'errore' : 'errori'} />
              <Stat value={answers.bestStreak} label="giuste di fila (record)" />
            </ul>
            <p className="muted">
              {data.data.reviewCards} tra parole ed errori nel ripasso. Dal ripasso li riprendi quando sono in scadenza.
            </p>
          </section>
        </>
      )}

      {path && (
        <section>
          <h2>Percorso</h2>
          <ul className="level-progress">
            {levelProgress(path).map((level) => (
              <li key={level.level}>
                <span className="level-name">{level.level}</span>
                <div
                  className="bar"
                  role="progressbar"
                  aria-label={`Livello ${level.level}`}
                  aria-valuemin={0}
                  aria-valuemax={level.total}
                  aria-valuenow={level.done}
                >
                  <span style={{ width: `${level.total ? (level.done / level.total) * 100 : 0}%` }} />
                </div>
                <small>
                  {level.done}/{level.total} capitoli
                </small>
              </li>
            ))}
          </ul>
          <button type="button" className="secondary" onClick={menu.onOpenPath}>
            Vai al percorso
          </button>
        </section>
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} userId={userId} current="profile" actions={menu} />
    </main>
  )
}
