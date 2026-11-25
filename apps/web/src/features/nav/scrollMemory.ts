import { useLayoutEffect } from 'react'

// Where each main screen was scrolled to when the learner left it, for this visit of the app
// (kept in memory: a reload starts every screen from the top again).
const positions = new Map<string, number>()

// The app is one page: the browser's own restore on reload would put an old position on whatever screen opens.
if (typeof history !== 'undefined') history.scrollRestoration = 'manual'

/** Call before leaving a main screen. */
export function rememberScroll(screen: string): void {
  positions.set(screen, window.scrollY)
}

/** The saved position of a screen, or undefined if it was never left. */
export function savedScroll(screen: string): number | undefined {
  return positions.get(screen)
}

/**
 * On every change of screen: back to where the learner was (main screens) or to the top.
 * A screen opened for the first time starts at the top.
 */
export function useRestoreScroll(screen: string, remember: boolean): void {
  useLayoutEffect(() => {
    const y = remember ? (positions.get(screen) ?? 0) : 0
    window.scrollTo(0, y)
    if (y === 0) return
    // Content read from the cache may still be laying out: try once more on the next frame. Only when
    // coming back to a position, so a screen opened fresh can still scroll itself (the path to its chapter).
    const id = requestAnimationFrame(() => window.scrollTo(0, y))
    return () => cancelAnimationFrame(id)
  }, [screen, remember])
}
