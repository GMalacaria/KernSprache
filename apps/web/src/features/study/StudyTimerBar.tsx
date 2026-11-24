import { Emoji } from '../../components/Emoji'
import { formatClock } from './studyMath'
import { useStudyTimer } from './useStudyTimer'

/** Daily timer: total time, written half and oral half. */
export function StudyTimerBar() {
  const { ready, goalSeconds, writtenSeconds, oralSeconds, status, isCounting, activeMode } = useStudyTimer()
  if (!ready) return <section className="study-timer muted">Carico il tempo di oggi…</section>
  const half = status.halfSeconds
  const pct = (value: number, max: number) => `${Math.min(100, (value / max) * 100)}%`

  return (
    <section className="study-timer" aria-label="Tempo di studio di oggi">
      <div className="row">
        <strong className="clock">
          <Emoji name="stopwatch" /> {formatClock(status.totalSeconds)} / {formatClock(goalSeconds)}
        </strong>
        {activeMode && !isCounting && !status.goalReached && <span className="tag">In pausa</span>}
        {status.goalReached && <span className="tag success">Obiettivo raggiunto</span>}
      </div>
      <div className="halves">
        <div className={`half${activeMode === 'written' ? ' current' : ''}`}>
          <div className="bar">
            <span style={{ width: pct(writtenSeconds, half) }} />
          </div>
          <small>
            Scritto {formatClock(Math.min(writtenSeconds, half))} / {formatClock(half)}
          </small>
        </div>
        <div className={`half${activeMode === 'oral' ? ' current' : ''}`}>
          <div className="bar">
            <span style={{ width: pct(oralSeconds, goalSeconds - half) }} />
          </div>
          <small>
            Orale {formatClock(Math.min(oralSeconds, goalSeconds - half))} / {formatClock(goalSeconds - half)}
          </small>
        </div>
      </div>
    </section>
  )
}
