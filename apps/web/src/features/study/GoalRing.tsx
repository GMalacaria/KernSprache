import { useEffect, useState } from 'react'
import { formatClock, formatMinutesLeft } from './studyMath'
import { useStudyTimer } from './useStudyTimer'
import { Waiting } from '../../components/Waiting'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Each half of the goal is half of the ring: written on the right, oral on the left. */
const HALF_ARC = CIRCUMFERENCE / 2
/** Room left at each end of a half, so the round caps of the two arcs do not touch. */
const CAP_ROOM = 7

interface HalfArcProps {
  className: string
  /** Where the half starts along the ring. */
  start: number
  /** Share of this half of the goal (0-1). */
  fill: number
  /** False before the entrance animation: the arc then grows from its start. */
  shown: boolean
}

/** One half of the ring, filled in proportion to that half of the goal. */
function HalfArc({ className, start, fill, shown }: HalfArcProps) {
  // A zero-length stroke with round caps still draws a dot: draw nothing for an empty half.
  if (fill <= 0) return null
  const length = (HALF_ARC - 2 * CAP_ROOM) * (shown ? fill : 0)
  return (
    <circle
      className={`ring-arc ${className}`}
      cx="60"
      cy="60"
      r={RADIUS}
      strokeDasharray={`${length} ${CIRCUMFERENCE}`}
      strokeDashoffset={-(start + CAP_ROOM)}
    />
  )
}

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

  // Each arc fills only with its own half: extra written time does not cover the oral half.
  const half = status.halfSeconds
  const writtenFill = Math.min(1, writtenSeconds / half)
  const oralFill = Math.min(1, oralSeconds / half)
  const goalMinutes = Math.round(goalSeconds / 60)

  return (
    <section className="goal-ring" aria-label="Tempo di studio di oggi">
      <div className={`ring${status.goalReached ? ' reached' : ''}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ring-track" cx="60" cy="60" r={RADIUS} />
          {status.goalReached && <circle className="ring-sun" cx="60" cy="60" r="43" />}
          <HalfArc className="written" start={0} fill={writtenFill} shown={shown} />
          <HalfArc className="oral" start={HALF_ARC} fill={oralFill} shown={shown} />
        </svg>
        <div className="ring-label">
          <strong className="ring-clock">{formatClock(status.totalSeconds)}</strong>
          <span>{status.goalReached ? 'Obiettivo raggiunto' : `su ${goalMinutes} min`}</span>
        </div>
      </div>
      <p className="ring-halves">
        <span className="written">
          Scritto <b>{formatClock(writtenSeconds)}</b> / {formatClock(half)}
          {status.writtenHalfDone && ' ✓'}
        </span>
        <span className="oral">
          Orale <b>{formatClock(oralSeconds)}</b> / {formatClock(half)}
          {status.oralHalfDone && ' ✓'}
        </span>
      </p>
      <GoalMissing />
    </section>
  )
}

/** With the total already past the goal but one half short, say what is still missing. */
export function GoalMissing() {
  const { ready, goalSeconds, status } = useStudyTimer()
  if (!ready || status.goalReached || status.totalSeconds < goalSeconds) return null
  const missing = status.writtenHalfDone
    ? `${formatMinutesLeft(status.oralMissingSeconds)} di orale`
    : `${formatMinutesLeft(status.writtenMissingSeconds)} di scritto`
  return (
    <p className="goal-missing" role="status">
      Per l'obiettivo servono metà tempo di scritto e metà di orale: mancano ancora {missing}.
    </p>
  )
}
