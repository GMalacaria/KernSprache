import { useLayoutEffect, useRef } from 'react'

/**
 * A feedback block pinned to the bottom of the lesson screen covers the end of the content:
 * keep the scrolling area's bottom padding as tall as the block so nothing hides behind it.
 */
export function useDock<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const body = el?.closest<HTMLElement>('.lesson-body')
    if (!active || !el || !body) return
    const sync = () => body.style.setProperty('--dock-height', `${el.offsetHeight}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => {
      observer.disconnect()
      body.style.removeProperty('--dock-height')
    }
  }, [active])
  return ref
}
