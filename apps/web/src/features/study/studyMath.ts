export type StudyMode = 'written' | 'oral'

/** Pause the timer after this long without any interaction. */
export const IDLE_AFTER_MS = 2 * 60_000

export interface StudyProgress {
  goalSeconds: number
  writtenSeconds: number
  oralSeconds: number
}

export interface StudyStatus {
  totalSeconds: number
  halfSeconds: number
  /** First half (written) completed. */
  writtenHalfDone: boolean
  goalReached: boolean
  /** Written until the first half is done, then oral. */
  recommendedMode: StudyMode
}

export function studyStatus(p: StudyProgress): StudyStatus {
  const totalSeconds = p.writtenSeconds + p.oralSeconds
  const halfSeconds = Math.ceil(p.goalSeconds / 2)
  const writtenHalfDone = p.writtenSeconds >= halfSeconds
  return {
    totalSeconds,
    halfSeconds,
    writtenHalfDone,
    goalReached: totalSeconds >= p.goalSeconds,
    recommendedMode: writtenHalfDone ? 'oral' : 'written',
  }
}

/** The learner is "really on the site": page visible, window focused, recent interaction. */
export function isLearnerActive(s: { visible: boolean; focused: boolean; lastActivityMs: number; nowMs: number }): boolean {
  return s.visible && s.focused && s.nowMs - s.lastActivityMs < IDLE_AFTER_MS
}

/** Calendar day (YYYY-MM-DD) in the learner's timezone. */
export function localDay(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  } catch {
    // Unknown timezone in the profile: fall back to the device's.
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  }
}

/** "m:ss" for the timer display. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const GOAL_OPTIONS = [10, 15, 20, 30, 45, 60] as const
