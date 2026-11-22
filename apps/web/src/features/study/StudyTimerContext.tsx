import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfile } from '../home/useProfile'
import { addStudyTime, fetchStudyDay, type StudyDay } from './api'
import { readFlag, writeFlag } from './storage'
import { isLearnerActive, localDay, studyStatus, type StudyMode } from './studyMath'
import { StudyTimerContext, type StudyTimer } from './useStudyTimer'

const FLUSH_EVERY_S = 10

export function StudyTimerProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const queryClient = useQueryClient()
  const profile = useProfile(userId)
  const timeZone = profile.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const [day, setDay] = useState(() => localDay(timeZone))
  const studyDay = useQuery({ queryKey: ['study-day', day], queryFn: () => fetchStudyDay(day) })

  const [activeMode, setActiveModeState] = useState<StudyMode | null>(null)
  const [isCounting, setIsCounting] = useState(false)
  const [pending, setPending] = useState({ written: 0, oral: 0 })
  const [halfwayDismissed, setHalfwayDismissed] = useState(() => readFlag(day, 'halfway-dismissed'))
  const [continued, setContinued] = useState(() => readFlag(day, 'continued'))

  const lastActivity = useRef(0)
  const pendingRef = useRef(pending)
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => {
    lastActivity.current = Date.now()
  }, [])
  const flushing = useRef(false)

  const markActivity = useCallback(() => {
    lastActivity.current = Date.now()
  }, [])

  // Any interaction with the page counts as activity.
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input'] as const
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true, capture: true }))
    return () => events.forEach((e) => window.removeEventListener(e, markActivity, { capture: true }))
  }, [markActivity])

  const flush = useCallback(async () => {
    if (flushing.current) return
    const toSend = pendingRef.current
    if (toSend.written === 0 && toSend.oral === 0) return
    flushing.current = true
    try {
      let latest: StudyDay | null = null
      for (const mode of ['written', 'oral'] as const) {
        const seconds = toSend[mode]
        if (seconds === 0) continue
        latest = await addStudyTime(day, mode, seconds)
        setPending((p) => ({ ...p, [mode]: p[mode] - seconds }))
      }
      if (latest) queryClient.setQueryData(['study-day', day], latest)
    } catch (err) {
      // Keep the seconds pending; the next flush retries them.
      console.error('Failed to save study time', err)
    } finally {
      flushing.current = false
    }
  }, [day, queryClient])

  const goalSeconds = (studyDay.data?.goal_minutes ?? profile.data?.daily_goal_minutes ?? 20) * 60
  const writtenSeconds = (studyDay.data?.written_seconds ?? 0) + pending.written
  const oralSeconds = (studyDay.data?.oral_seconds ?? 0) + pending.oral
  const status = studyStatus({ goalSeconds, writtenSeconds, oralSeconds })
  const showGoalReached = activeMode !== null && status.goalReached && !continued
  const showHalfwayPrompt =
    activeMode === 'written' && status.writtenHalfDone && !status.goalReached && !halfwayDismissed

  // Save right away when the goal is reached, so the day is marked completed on the server.
  const goalReached = status.goalReached
  useEffect(() => {
    if (goalReached) void flush()
  }, [goalReached, flush])

  // One tick per second: count a second for the active mode when the learner is really here.
  const canCount = activeMode !== null && !showGoalReached && studyDay.isSuccess
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      const today = localDay(timeZone, new Date(now))
      if (today !== day) {
        void flush().then(() => {
          setDay(today)
          setHalfwayDismissed(readFlag(today, 'halfway-dismissed'))
          setContinued(readFlag(today, 'continued'))
        })
        return
      }
      const active =
        canCount &&
        isLearnerActive({
          visible: document.visibilityState === 'visible',
          focused: document.hasFocus(),
          lastActivityMs: lastActivity.current,
          nowMs: now,
        })
      setIsCounting(active)
      if (active && activeMode) {
        setPending((p) => {
          const next = { ...p, [activeMode]: p[activeMode] + 1 }
          if (next.written + next.oral >= FLUSH_EVERY_S) queueMicrotask(() => void flush())
          return next
        })
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [activeMode, canCount, day, flush, timeZone])

  // Save what is pending when the page is hidden or the screen changes.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onPageHide = () => void flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flush])

  const setActiveMode = useCallback(
    (mode: StudyMode | null) => {
      void flush()
      lastActivity.current = Date.now()
      setActiveModeState(mode)
    },
    [flush],
  )

  const dismissHalfwayPrompt = useCallback(() => {
    writeFlag(day, 'halfway-dismissed')
    setHalfwayDismissed(true)
  }, [day])

  const continueAfterGoal = useCallback(() => {
    writeFlag(day, 'continued')
    lastActivity.current = Date.now()
    setContinued(true)
  }, [day])

  const value = useMemo<StudyTimer>(
    () => ({
      day,
      ready: studyDay.isSuccess && profile.isSuccess,
      goalSeconds,
      writtenSeconds,
      oralSeconds,
      status,
      activeMode,
      isCounting,
      showHalfwayPrompt,
      showGoalReached,
      setActiveMode,
      markActivity,
      dismissHalfwayPrompt,
      continueAfterGoal,
    }),
    [
      day,
      studyDay.isSuccess,
      profile.isSuccess,
      goalSeconds,
      writtenSeconds,
      oralSeconds,
      status,
      activeMode,
      isCounting,
      showHalfwayPrompt,
      showGoalReached,
      setActiveMode,
      markActivity,
      dismissHalfwayPrompt,
      continueAfterGoal,
    ],
  )

  return <StudyTimerContext.Provider value={value}>{children}</StudyTimerContext.Provider>
}
