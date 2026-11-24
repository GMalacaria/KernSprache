import { useEffect, useState } from 'react'
import { formatClock } from './studyMath'
import { useStudyTimer } from './useStudyTimer'
import { Waiting } from '../../components/Waiting'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Today's goal as a ring: fills when the screen opens, turns into a sun once the goal is reached. */
export function GoalRing() {
  const { ready, goalSeconds, writtenSeconds, oralSeconds, status } = useStudyTimer()
  // Start empty, then fill on the next frame so the arc animates in once.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!ready) return <section className="goal-ring"><Waiting title="Carico il tempo di oggi" compact /></section>

  const progress = Math.min(1, status.totalSeconds / goalSeconds)
  const half = status.halfSeconds
  const goalMinutes = Math.round(goalSeconds / 60)

  return (
    <section className="goal-ring" aria-label="Tempo di studio di oggi">
      <div className={`ring${status.goalReached ? ' reached' : ''}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ring-track" cx="60" cy="60" r={RADIUS} />
          {status.goalReached && <circle className="ring-sun" cx="60" cy="60" r="43" />}
          <circle
            className="ring-arc"
            cx="60"
            cy="60"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - (shown ? progress : 0))}
          />
        </svg>
        <div className="ring-label">
          <strong className="ring-clock">{formatClock(status.totalSeconds)}</strong>
          <span>{status.goalReached ? 'Obiettivo raggiunto' : `su ${goalMinutes} min`}</span>
        </div>
      </div>
      <p className="ring-halves">
        <span>
          Scritto <b>{formatClock(Math.min(writtenSeconds, half))}</b> / {formatClock(half)}
        </span>
        <span>
          Orale <b>{formatClock(Math.min(oralSeconds, goalSeconds - half))}</b> / {formatClock(goalSeconds - half)}
        </span>
      </p>
    </section>
  )
}
