export type StudyMode = 'written' | 'oral'

/** Pause the timer after this long without any interaction. */
export const IDLE_AFTER_MS = 2 * 60_000

export interface StudyProgress {
  goalSeconds: number
  writtenSeconds: number
  oralSeconds: number
}

export interface StudyStatus {
  /** All the time studied today, shown in full even past the goal. */
  totalSeconds: number
  /** Seconds each half needs: half of the goal for written, half for oral. */
  halfSeconds: number
  /** Written half completed. */
  writtenHalfDone: boolean
  /** Oral half completed. */
  oralHalfDone: boolean
  /** Time still missing in each half (0 when done). */
  writtenMissingSeconds: number
  oralMissingSeconds: number
  /** Reached only with both halves: the total alone is not enough (same rule as add_study_time). */
  goalReached: boolean
  /** Written until its half is done, then oral; back to written if only the oral half is done. */
  recommendedMode: StudyMode
}

export function studyStatus(p: StudyProgress): StudyStatus {
  const totalSeconds = p.writtenSeconds + p.oralSeconds
  const halfSeconds = Math.ceil(p.goalSeconds / 2)
  const writtenMissingSeconds = Math.max(0, halfSeconds - p.writtenSeconds)
  const oralMissingSeconds = Math.max(0, halfSeconds - p.oralSeconds)
  const writtenHalfDone = writtenMissingSeconds === 0
  const oralHalfDone = oralMissingSeconds === 0
  return {
    totalSeconds,
    halfSeconds,
    writtenHalfDone,
    oralHalfDone,
    writtenMissingSeconds,
    oralMissingSeconds,
    goalReached: writtenHalfDone && oralHalfDone,
    recommendedMode: writtenHalfDone ? 'oral' : 'written',
  }
}

/** "4 min" (rounded up, so "1 min" until the very last second). */
export function formatMinutesLeft(seconds: number): string {
  return `${Math.max(1, Math.ceil(seconds / 60))} min`
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
