import { createContext, useContext, useEffect } from 'react'
import type { StudyMode, StudyStatus } from './studyMath'

export interface StudyTimer {
  day: string
  /** Profile and today's progress are loaded. */
  ready: boolean
  goalSeconds: number
  writtenSeconds: number
  oralSeconds: number
  status: StudyStatus
  /** Mode of the activity on screen; null outside dialogue/review. */
  activeMode: StudyMode | null
  /** The clock is running right now. */
  isCounting: boolean
  /** Prompt to switch to oral after the written half. */
  showHalfwayPrompt: boolean
  /** Goal reached: the activity is paused until the learner asks to continue. */
  showGoalReached: boolean
  setActiveMode: (mode: StudyMode | null) => void
  markActivity: () => void
  dismissHalfwayPrompt: () => void
  continueAfterGoal: () => void
}

export const StudyTimerContext = createContext<StudyTimer | null>(null)

export function useStudyTimer(): StudyTimer {
  const ctx = useContext(StudyTimerContext)
  if (!ctx) throw new Error('useStudyTimer must be used inside StudyTimerProvider')
  return ctx
}

/** Declares the study mode of the screen while it is mounted. */
export function useStudyActivity(mode: StudyMode): StudyTimer {
  const timer = useStudyTimer()
  const { setActiveMode } = timer
  useEffect(() => {
    setActiveMode(mode)
    return () => setActiveMode(null)
  }, [mode, setActiveMode])
  return timer
}
