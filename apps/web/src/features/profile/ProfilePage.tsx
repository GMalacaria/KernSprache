import { useQuery } from '@tanstack/react-query'
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

interface ProfilePageProps {
  userId: string
  onEditGoals: () => void
  onRetakePlacement: () => void
}

/** The learner's profile: level and purpose, streaks, study time, answers and progress through the path. */
export function ProfilePage({ userId, onEditGoals, onRetakePlacement }: ProfilePageProps) {
  const profile = useProfile(userId)
  const { path } = usePath(userId)
  const data = useQuery({ queryKey: ['profile-data'], queryFn: fetchProfileData })

  const today = localDay(profile.data?.timezone ?? 'Europe/Rome')
  const days = data.data?.days ?? []
  const answers = summarizeStats(data.data?.lessonStats ?? [])
  const bars = lastDaysMinutes(days, today)
  const goalMinutes = profile.data?.daily_goal_minutes ?? 20
  // Each bar is one half of the day (written or oral): its target is half the daily goal.
  const halfGoal = goalMinutes / 2
  // Round the scale up to a multiple of 10 above the longest bar and the target, so no bar touches the top.
  const scaleMinutes =
    Math.ceil((Math.max(halfGoal, ...bars.flatMap((b) => [b.written, b.oral])) * 1.1) / 10) * 10
  const pct = (minutes: number) => `${Math.min(100, (minutes / scaleMinutes) * 100)}%`
  const barHeight = (minutes: number) => (minutes > 0 ? pct(minutes) : '2px')
  const hasStudied = days.length > 0 || answers.lessons > 0

  return (
    <main className="page profile">
      <header className="sticky-header">
        <h1>Profilo</h1>
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
          <div className="profile-actions">
            <button type="button" className="link" onClick={onEditGoals}>
              Modifica obiettivo e scopo
            </button>
            <button type="button" className="link" onClick={onRetakePlacement}>
              Rifai il test di livello
            </button>
          </div>
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
            <figure className="day-chart">
              <figcaption>
                Minuti di studio al giorno, ultimi 14 giorni
                <span className="day-chart-legend">
                  <span>
                    <span className="legend-swatch written" aria-hidden="true" /> scritto
                  </span>
                  <span>
                    <span className="legend-swatch oral" aria-hidden="true" /> orale
                  </span>
                  <span>
                    <span className="goal-dash" aria-hidden="true" /> metà obiettivo ({halfGoal.toLocaleString('it-IT')} min)
                  </span>
                </span>
              </figcaption>
              <div className="day-chart-body">
                <div className="day-chart-axis" aria-hidden="true">
                  <span>{scaleMinutes}</span>
                  <span>{scaleMinutes / 2}</span>
                  <span>0</span>
                </div>
                <div className="day-chart-plot">
                  <span className="day-chart-goal" style={{ bottom: pct(halfGoal) }} aria-hidden="true" />
                  <ol aria-label="Minuti di scritto e di orale negli ultimi 14 giorni">
                    {bars.map((bar) => (
                      <li key={bar.day} title={`${bar.day}: ${bar.written} min di scritto, ${bar.oral} min di orale`}>
                        <span className="day-bar written" style={{ height: barHeight(bar.written) }} />
                        <span className="day-bar oral" style={{ height: barHeight(bar.oral) }} />
                        <span className="visually-hidden">
                          {bar.day}: {bar.written} minuti di scritto, {bar.oral} di orale
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <span aria-hidden="true" />
                <ol className="day-chart-days" aria-hidden="true">
                  {bars.map((bar) => (
                    <li key={bar.day}>{WEEKDAYS[new Date(`${bar.day}T12:00:00Z`).getUTCDay()]}</li>
                  ))}
                </ol>
              </div>
            </figure>
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
        </section>
      )}

    </main>
  )
}
