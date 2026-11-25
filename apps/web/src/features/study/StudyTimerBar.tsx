import { useTranslation } from 'react-i18next'
import { Emoji } from '../../components/Emoji'
import { GoalMissing } from './GoalRing'
import { formatClock } from './studyMath'
import { useStudyTimer } from './useStudyTimer'
import { Waiting } from '../../components/Waiting'

/** Daily timer: total time, written half and oral half (the goal needs both halves). */
export function StudyTimerBar() {
  const { t } = useTranslation(['study', 'common'])
  const { ready, goalSeconds, writtenSeconds, oralSeconds, status, isCounting, activeMode } = useStudyTimer()
  if (!ready) return <section className="study-timer"><Waiting title={t('common:loading.today')} compact /></section>
  const half = status.halfSeconds
  const pct = (value: number) => `${Math.min(100, (value / half) * 100)}%`

  return (
    <section className="study-timer" aria-label={t('todayAria')}>
      <div className="row">
        <strong className="clock">
          <Emoji name="stopwatch" /> {formatClock(status.totalSeconds)} / {formatClock(goalSeconds)}
        </strong>
        {activeMode && !isCounting && !status.goalReached && <span className="tag">{t('paused')}</span>}
        {status.goalReached && <span className="tag success">{t('goalReached')}</span>}
      </div>
      <div className="halves">
        <div className={`half written${activeMode === 'written' ? ' current' : ''}`}>
          <div className="bar">
            <span style={{ width: pct(writtenSeconds) }} />
          </div>
          <small>
            {t('common:parts.written')} {formatClock(writtenSeconds)} / {formatClock(half)}
            {status.writtenHalfDone && ' ✓'}
          </small>
        </div>
        <div className={`half oral${activeMode === 'oral' ? ' current' : ''}`}>
          <div className="bar">
            <span style={{ width: pct(oralSeconds) }} />
          </div>
          <small>
            {t('common:parts.oral')} {formatClock(oralSeconds)} / {formatClock(half)}
            {status.oralHalfDone && ' ✓'}
          </small>
        </div>
      </div>
      <GoalMissing />
    </section>
  )
}
