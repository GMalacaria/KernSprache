import { describe, expect, it } from 'vitest'
import type { ChapterView } from '../path/progress'
import {
  bestGoalStreak,
  formatDuration,
  goalStreak,
  lastDaysMinutes,
  levelProgress,
  studiedDays,
  totalStudySeconds,
  type StudyDayRow,
} from './profileStats'

const day = (d: string, minutes: number, done = false): StudyDayRow => ({
  day: d,
  written_seconds: minutes * 30,
  oral_seconds: minutes * 30,
  completed_at: done ? `${d}T20:00:00Z` : null,
})

describe('goalStreak', () => {
  const days = [day('2026-11-20', 15, true), day('2026-11-21', 15, true), day('2026-11-22', 15, true)]

  it('counts the run that ended yesterday while today is still open', () => {
    expect(goalStreak(days, '2026-11-23')).toBe(3)
  })

  it('adds today once its goal is reached', () => {
    expect(goalStreak([...days, day('2026-11-23', 15, true)], '2026-11-23')).toBe(4)
  })

  it('is zero after a missed day, and ignores days without the goal', () => {
    expect(goalStreak(days, '2026-11-25')).toBe(0)
    expect(goalStreak([day('2026-11-22', 5, false)], '2026-11-23')).toBe(0)
  })
})

describe('bestGoalStreak', () => {
  it('finds the longest run, not the latest', () => {
    const days = [
      day('2026-11-01', 15, true),
      day('2026-11-02', 15, true),
      day('2026-11-03', 15, true),
      day('2026-11-10', 15, true),
      day('2026-11-11', 15, true),
    ]
    expect(bestGoalStreak(days)).toBe(3)
    expect(bestGoalStreak([])).toBe(0)
  })

  it('handles month ends', () => {
    expect(bestGoalStreak([day('2026-10-31', 15, true), day('2026-11-01', 15, true)])).toBe(2)
  })
})

describe('study totals', () => {
  const days = [day('2026-11-20', 10), day('2026-11-21', 0), day('2026-11-22', 20)]

  it('adds up time and counts the days with study', () => {
    expect(totalStudySeconds(days)).toBe(1800)
    expect(studiedDays(days)).toBe(2)
  })

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(45 * 60)).toBe('45 min')
    expect(formatDuration(135 * 60)).toBe('2 h 15 min')
    expect(formatDuration(180 * 60)).toBe('3 h')
  })
})

describe('lastDaysMinutes', () => {
  it('returns the last days oldest first, filling the gaps with zero', () => {
    const bars = lastDaysMinutes([day('2026-11-22', 12), day('2026-11-20', 5)], '2026-11-23', 4)
    expect(bars).toEqual([
      { day: '2026-11-20', minutes: 5 },
      { day: '2026-11-21', minutes: 0 },
      { day: '2026-11-22', minutes: 12 },
      { day: '2026-11-23', minutes: 0 },
    ])
  })
})

describe('levelProgress', () => {
  it('counts passed and skipped chapters per level', () => {
    const chapter = (level: ChapterView['level'], status: ChapterView['status']) => ({ level, status }) as ChapterView
    const path = [chapter('A1', 'skipped'), chapter('A1', 'done'), chapter('A2', 'current'), chapter('A2', 'locked')]
    expect(levelProgress(path)).toEqual([
      { level: 'A1', done: 2, total: 2 },
      { level: 'A2', done: 0, total: 2 },
      { level: 'B1', done: 0, total: 0 },
      { level: 'B2', done: 0, total: 0 },
    ])
  })
})
