import { describe, expect, it } from 'vitest'
import { formatClock, formatMinutesLeft, IDLE_AFTER_MS, isLearnerActive, localDay, studyStatus } from './studyMath'

describe('formatMinutesLeft', () => {
  it.each([
    [480, '8 min'],
    [61, '2 min'],
    [1, '1 min'],
    [0, '1 min'],
  ])('%i -> %s', (s, out) => expect(formatMinutesLeft(s)).toBe(out))
})

describe('studyStatus', () => {
  it('recommends written until half the goal is written, then oral', () => {
    expect(studyStatus({ goalSeconds: 1200, writtenSeconds: 599, oralSeconds: 0 }).recommendedMode).toBe('written')
    const half = studyStatus({ goalSeconds: 1200, writtenSeconds: 600, oralSeconds: 0 })
    expect(half.writtenHalfDone).toBe(true)
    expect(half.recommendedMode).toBe('oral')
    expect(half.goalReached).toBe(false)
  })

  it('reaches the goal only with half written and half oral, not on the total', () => {
    expect(studyStatus({ goalSeconds: 1200, writtenSeconds: 600, oralSeconds: 600 }).goalReached).toBe(true)
    expect(studyStatus({ goalSeconds: 1200, writtenSeconds: 1500, oralSeconds: 600 }).goalReached).toBe(true)
    const oralShort = studyStatus({ goalSeconds: 1200, writtenSeconds: 1080, oralSeconds: 120 })
    expect(oralShort.totalSeconds).toBe(1200)
    expect(oralShort.goalReached).toBe(false)
    expect(oralShort.oralMissingSeconds).toBe(480)
    expect(oralShort.writtenMissingSeconds).toBe(0)
    expect(studyStatus({ goalSeconds: 1200, writtenSeconds: 599, oralSeconds: 900 }).goalReached).toBe(false)
  })

  it('goes back to written when only the oral half is done', () => {
    expect(studyStatus({ goalSeconds: 1200, writtenSeconds: 100, oralSeconds: 700 }).recommendedMode).toBe('written')
  })

  it('rounds the half up for odd goals', () => {
    expect(studyStatus({ goalSeconds: 301, writtenSeconds: 0, oralSeconds: 0 }).halfSeconds).toBe(151)
  })
})

describe('isLearnerActive', () => {
  const base = { visible: true, focused: true, lastActivityMs: 0, nowMs: 1000 }
  it('counts only when visible, focused and recently used', () => {
    expect(isLearnerActive(base)).toBe(true)
    expect(isLearnerActive({ ...base, visible: false })).toBe(false)
    expect(isLearnerActive({ ...base, focused: false })).toBe(false)
    expect(isLearnerActive({ ...base, nowMs: IDLE_AFTER_MS })).toBe(false)
    expect(isLearnerActive({ ...base, nowMs: IDLE_AFTER_MS - 1 })).toBe(true)
  })
})

describe('localDay', () => {
  it('uses the learner timezone', () => {
    const lateEveningUtc = new Date('2026-11-22T23:30:00Z')
    expect(localDay('Europe/Rome', lateEveningUtc)).toBe('2026-11-23')
    expect(localDay('America/New_York', lateEveningUtc)).toBe('2026-11-22')
  })
  it('falls back to the device timezone for unknown zones', () => {
    expect(localDay('Not/AZone', new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [65, '1:05'],
    [1200, '20:00'],
  ])('%i -> %s', (s, out) => expect(formatClock(s)).toBe(out))
})
