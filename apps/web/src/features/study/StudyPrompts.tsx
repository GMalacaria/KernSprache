import { useTranslation } from 'react-i18next'
import { Emoji } from '../../components/Emoji'
import { formatClock } from './studyMath'
import { useStudyTimer } from './useStudyTimer'

interface StudyPromptsProps {
  /** Switches the current activity to the oral dialogue; undefined if voice is unavailable. */
  onSwitchToOral?: () => void
  onExit: () => void
}

/** Halfway invitation to switch to oral, and the goal-reached banner that pauses the exercise. */
export function StudyPrompts({ onSwitchToOral, onExit }: StudyPromptsProps) {
  const { t } = useTranslation(['study', 'common'])
  const timer = useStudyTimer()

  if (timer.showGoalReached) {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="goal-title">
        <div className="overlay-card success-card">
          <p className="big">
            <Emoji name="party" size="3rem" />
          </p>
          <h2 id="goal-title">{t('goalDialog.title')}</h2>
          <p>
            {t('goalDialog.body', {
              total: formatClock(timer.status.totalSeconds),
              written: formatClock(timer.writtenSeconds),
              oral: formatClock(timer.oralSeconds),
            })}
          </p>
          <div className="stack">
            <button type="button" onClick={timer.continueAfterGoal}>
              {t('common:actions.continuePractice')}
            </button>
            <button type="button" className="link" onClick={onExit}>
              {t('common:actions.backHome')}
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
          <strong>{t('halfway.title')}</strong>{' '}
          {onSwitchToOral
            ? t('halfway.switch')
            : t('halfway.noMic')}
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
              {t('halfway.goOral')}
            </button>
          )}
          <button type="button" className="link" onClick={timer.dismissHalfwayPrompt}>
            {t('halfway.keepWritten')}
          </button>
        </div>
      </aside>
    )
  }

  return null
}
