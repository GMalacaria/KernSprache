// Pure helpers for the daily reminder: local time of a learner, streak, message choice.

/** Local calendar day (YYYY-MM-DD) and hour (0-23) of an instant in an IANA time zone. */
export function localDayAndHour(now: Date, timeZone: string): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

/** The calendar day before `day` (YYYY-MM-DD). */
export function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Consecutive days with a completed goal, counted back from yesterday. */
export function streakEndingYesterday(completedDays: ReadonlySet<string>, today: string): number {
  let streak = 0
  for (let day = previousDay(today); completedDays.has(day); day = previousDay(day)) streak++
  return streak
}

/** Hour of a Postgres `time` value such as "19:00:00". */
export function hourOfTime(time: string): number {
  return Number(time.split(':')[0])
}

export type ReminderKind = 'streak' | 'due_reviews' | 'daily_goal'

export interface ReminderInput {
  /** Today's goal is already reached. */
  goalReached: boolean
  /** Consecutive completed days up to yesterday. */
  streak: number
  /** Cards (words and mistakes) due for review. */
  dueCount: number
  goalMinutes: number
}

export interface Reminder {
  kind: ReminderKind
  title: string
  body: string
}

/** At most one reminder a day: none once the goal is reached, otherwise the most pressing one. */
export function decideReminder({ goalReached, streak, dueCount, goalMinutes }: ReminderInput): Reminder | null {
  if (goalReached) return null
  if (streak >= 2) {
    return {
      kind: 'streak',
      title: `Serie di ${streak} giorni a rischio`,
      body: `Oggi non hai ancora studiato: bastano ${goalMinutes} minuti per non interromperla.`,
    }
  }
  if (dueCount > 0) {
    return {
      kind: 'due_reviews',
      title: 'Ripassi in scadenza',
      body: dueCount === 1 ? 'Hai 1 carta da ripassare.' : `Hai ${dueCount} carte da ripassare.`,
    }
  }
  return {
    kind: 'daily_goal',
    title: 'È ora di studiare',
    body: `Il tuo obiettivo di oggi sono ${goalMinutes} minuti.`,
  }
}
