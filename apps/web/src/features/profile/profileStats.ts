import { LEVELS, type CefrLevel, type ChapterView } from '../path/progress'

/** One row of study_days, as the profile needs it. */
export interface StudyDayRow {
  /** Local day, YYYY-MM-DD. */
  day: string
  written_seconds: number
  oral_seconds: number
  /** Set when the daily goal was reached. */
  completed_at: string | null
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function completedDays(days: StudyDayRow[]): Set<string> {
  return new Set(days.filter((d) => d.completed_at !== null).map((d) => d.day))
}

/**
 * Days in a row on which the daily goal was reached, same rule as the reminders: today counts if it is
 * already done, otherwise the run is the one that ended yesterday (today is still open).
 */
export function goalStreak(days: StudyDayRow[], today: string): number {
  const done = completedDays(days)
  let streak = 0
  for (let day = done.has(today) ? today : shiftDay(today, -1); done.has(day); day = shiftDay(day, -1)) streak++
  return streak
}

/** The longest run of goal days ever. */
export function bestGoalStreak(days: StudyDayRow[]): number {
  const sorted = [...completedDays(days)].sort()
  let best = 0
  let run = 0
  let previous: string | null = null
  for (const day of sorted) {
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}

export function totalStudySeconds(days: StudyDayRow[]): number {
  return days.reduce((n, d) => n + d.written_seconds + d.oral_seconds, 0)
}

/** Days with any study time. */
export function studiedDays(days: StudyDayRow[]): number {
  return days.filter((d) => d.written_seconds + d.oral_seconds > 0).length
}

export interface DayBar {
  day: string
  minutes: number
}

/** Minutes studied on each of the last `count` days, oldest first (days without a row are 0). */
export function lastDaysMinutes(days: StudyDayRow[], today: string, count = 14): DayBar[] {
  const byDay = new Map(days.map((d) => [d.day, d.written_seconds + d.oral_seconds]))
  return Array.from({ length: count }, (_, i) => {
    const day = shiftDay(today, i - (count - 1))
    return { day, minutes: Math.round((byDay.get(day) ?? 0) / 60) }
  })
}

/** "45 min", "2 h 15 min", "3 h". */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export interface LevelProgress {
  level: CefrLevel
  /** Chapters passed or skipped. */
  done: number
  total: number
}

export function levelProgress(path: ChapterView[]): LevelProgress[] {
  return LEVELS.map((level) => {
    const chapters = path.filter((c) => c.level === level)
    return {
      level,
      done: chapters.filter((c) => c.status === 'done' || c.status === 'skipped').length,
      total: chapters.length,
    }
  })
}
