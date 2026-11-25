import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation(['profile', 'common'])
  const weekdays = t('chart.weekdays').split(',')
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
        <h1>{t('title')}</h1>
      </header>

      {profile.data && (
        <section className="profile-hero">
          <p className="level-badge" aria-label={t('common:level', { level: profile.data.level })}>
            {profile.data.level}
          </p>
          <p>
            {t('goalLine', { purpose: purposeLabel(profile.data.purpose), minutes: profile.data.daily_goal_minutes })}
          </p>
          {profile.data.goal && <p className="muted">«{profile.data.goal}»</p>}
          <div className="profile-actions">
            <button type="button" className="link" onClick={onEditGoals}>
              {t('editGoals')}
            </button>
            <button type="button" className="link" onClick={onRetakePlacement}>
              {t('retakePlacement')}
            </button>
          </div>
        </section>
      )}

      {data.isPending && <Waiting title={t('loading')} compact />}
      {data.isError && <p className="error">{t('loadError')}</p>}

      {data.isSuccess && !hasStudied && (
        <p className="notice">{t('empty')}</p>
      )}

      {data.isSuccess && hasStudied && (
        <>
          <section>
            <h2>{t('consistency')}</h2>
            <ul className="stats-grid stats-grid-4">
              <Stat value={goalStreak(days, today)} label={t('streak')} />
              <Stat value={bestGoalStreak(days)} label={t('bestStreak')} />
              <Stat value={studiedDays(days)} label={t('studyDays')} />
              <Stat value={formatDuration(totalStudySeconds(days))} label={t('totalTime')} />
            </ul>
            <figure className="day-chart">
              <figcaption>
                {t('chart.caption')}
                <span className="day-chart-legend">
                  <span>
                    <span className="legend-swatch written" aria-hidden="true" /> {t('chart.written')}
                  </span>
                  <span>
                    <span className="legend-swatch oral" aria-hidden="true" /> {t('chart.oral')}
                  </span>
                  <span>
                    <span className="goal-dash" aria-hidden="true" />{' '}
                    {t('chart.halfGoal', { minutes: halfGoal.toLocaleString(i18n.language) })}
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
                  <ol aria-label={t('chart.aria')}>
                    {bars.map((bar) => (
                      <li key={bar.day} title={t('chart.barTitle', { day: bar.day, written: bar.written, oral: bar.oral })}>
                        <span className="day-bar written" style={{ height: barHeight(bar.written) }} />
                        <span className="day-bar oral" style={{ height: barHeight(bar.oral) }} />
                        <span className="visually-hidden">
                          {t('chart.barText', { day: bar.day, written: bar.written, oral: bar.oral })}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <span aria-hidden="true" />
                <ol className="day-chart-days" aria-hidden="true">
                  {bars.map((bar) => (
                    <li key={bar.day}>{weekdays[new Date(`${bar.day}T12:00:00Z`).getUTCDay()]}</li>
                  ))}
                </ol>
              </div>
            </figure>
          </section>

          <section>
            <h2>{t('answers')}</h2>
            <ul className="stats-grid stats-grid-4">
              <Stat value={answers.lessons} label={t('lessons', { count: answers.lessons })} />
              <Stat value={answers.successRate === null ? '–' : `${answers.successRate}%`} label={t('correctAnswers')} />
              <Stat value={answers.mistakes} label={t('mistakes', { count: answers.mistakes })} />
              <Stat value={answers.bestStreak} label={t('bestRun')} />
            </ul>
            <p className="muted">
              {t('reviewCards', { count: data.data.reviewCards })}
            </p>
          </section>
        </>
      )}

      {path && (
        <section>
          <h2>{t('path')}</h2>
          <ul className="level-progress">
            {levelProgress(path).map((level) => (
              <li key={level.level}>
                <span className="level-name">{level.level}</span>
                <div
                  className="bar"
                  role="progressbar"
                  aria-label={t('common:level', { level: level.level })}
                  aria-valuemin={0}
                  aria-valuemax={level.total}
                  aria-valuenow={level.done}
                >
                  <span style={{ width: `${level.total ? (level.done / level.total) * 100 : 0}%` }} />
                </div>
                <small>
                  {t('chapters', { done: level.done, total: level.total })}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

    </main>
  )
}
