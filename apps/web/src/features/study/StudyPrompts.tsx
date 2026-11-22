import { formatClock } from './studyMath'
import { useStudyTimer } from './useStudyTimer'

interface StudyPromptsProps {
  /** Switches the current activity to the oral dialogue; undefined if voice is unavailable. */
  onSwitchToOral?: () => void
  onExit: () => void
}

/** Halfway invitation to switch to oral, and the goal-reached banner that pauses the exercise. */
export function StudyPrompts({ onSwitchToOral, onExit }: StudyPromptsProps) {
  const timer = useStudyTimer()

  if (timer.showGoalReached) {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="goal-title">
        <div className="overlay-card success-card">
          <p className="big">🎉</p>
          <h2 id="goal-title">Obiettivo di oggi raggiunto!</h2>
          <p>
            Hai studiato {formatClock(timer.status.totalSeconds)} minuti: {formatClock(timer.writtenSeconds)} di
            scritto e {formatClock(timer.oralSeconds)} di orale.
          </p>
          <div className="stack">
            <button type="button" onClick={timer.continueAfterGoal}>
              Continua ad allenarti
            </button>
            <button type="button" className="link" onClick={onExit}>
              Torna alla home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (timer.showHalfwayPrompt) {
    return (
      <aside className="halfway" role="status">
        <p>
          <strong>Prima metà completata!</strong>{' '}
          {onSwitchToOral
            ? 'Ora passa alla parte orale: rispondi a voce al tutor.'
            : 'Su questo dispositivo il microfono non è disponibile: puoi continuare con lo scritto.'}
        </p>
        <div className="row">
          {onSwitchToOral && (
            <button
              type="button"
              onClick={() => {
                timer.dismissHalfwayPrompt()
                onSwitchToOral()
              }}
            >
              Passa all'orale
            </button>
          )}
          <button type="button" className="link" onClick={timer.dismissHalfwayPrompt}>
            Continua con lo scritto
          </button>
        </div>
      </aside>
    )
  }

  return null
}
