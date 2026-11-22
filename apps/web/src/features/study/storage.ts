// Per-viewer UI memory for the current day (dismissed prompts). Purely a convenience:
// every access is guarded because storage can be unavailable (private mode, blocked).

function key(day: string, name: string): string {
  return `study:${day}:${name}`
}

export function readFlag(day: string, name: string): boolean {
  try {
    return window.localStorage.getItem(key(day, name)) === '1'
  } catch {
    return false
  }
}

export function writeFlag(day: string, name: string): void {
  try {
    window.localStorage.setItem(key(day, name), '1')
  } catch {
    // Ignore: the flag simply will not survive a reload.
  }
}
