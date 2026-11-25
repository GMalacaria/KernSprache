/**
 * Scrolls whatever holds `el` all the way to the bottom: its nearest scrolling ancestor (the lesson
 * body) or else the page. Used by the chats so the newest message and the answer box are in view.
 * Scrolling to the very end, not to a marker, also covers the container's bottom padding: otherwise
 * a sticky answer box could sit over the last lines.
 */
export function scrollToEnd(el: Element | null): void {
  if (!el) return
  // Wait for the new message to be laid out before measuring.
  requestAnimationFrame(() => {
    let node = el.parentElement
    while (node && node !== document.body) {
      const overflowY = getComputedStyle(node).overflowY
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
        return
      }
      node = node.parentElement
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  })
}
