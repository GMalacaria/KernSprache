import { assertEquals } from 'jsr:@std/assert@1'
import { decideReminder, hourOfTime, localDayAndHour, previousDay, streakEndingYesterday } from './reminders.ts'

Deno.test('localDayAndHour follows the learner time zone', () => {
  const instant = new Date('2026-11-23T23:30:00Z')
  assertEquals(localDayAndHour(instant, 'Europe/Rome'), { day: '2026-11-24', hour: 0 })
  assertEquals(localDayAndHour(instant, 'America/New_York'), { day: '2026-11-23', hour: 18 })
  assertEquals(localDayAndHour(new Date('2026-07-01T17:05:00Z'), 'Europe/Rome'), { day: '2026-07-01', hour: 19 })
})

Deno.test('previousDay crosses month and year', () => {
  assertEquals(previousDay('2026-03-01'), '2026-02-28')
  assertEquals(previousDay('2027-01-01'), '2026-12-31')
})

Deno.test('streak counts back from yesterday and ignores today', () => {
  const done = new Set(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-17'])
  assertEquals(streakEndingYesterday(done, '2026-11-23'), 3)
  assertEquals(streakEndingYesterday(new Set(['2026-11-23']), '2026-11-23'), 0)
  assertEquals(streakEndingYesterday(new Set(['2026-11-21']), '2026-11-23'), 0)
})

Deno.test('hourOfTime reads Postgres time values', () => {
  assertEquals(hourOfTime('19:00:00'), 19)
  assertEquals(hourOfTime('07:30'), 7)
})

Deno.test('decideReminder: goal reached means silence, then streak, reviews, goal', () => {
  const base = { goalReached: false, streak: 0, dueCount: 0, goalMinutes: 20 }
  assertEquals(decideReminder({ ...base, goalReached: true, streak: 5, dueCount: 9 }), null)
  assertEquals(decideReminder({ ...base, streak: 3, dueCount: 9 })?.kind, 'streak')
  assertEquals(decideReminder({ ...base, streak: 1, dueCount: 9 })?.kind, 'due_reviews')
  assertEquals(decideReminder({ ...base, dueCount: 1 })?.body, 'Hai 1 carta da ripassare.')
  assertEquals(decideReminder(base)?.kind, 'daily_goal')
  assertEquals(decideReminder(base)?.body, 'Il tuo obiettivo di oggi sono 20 minuti.')
})
