/** Volume (RMS of the waveform, 0-1) above which a moment counts as someone speaking, not room noise. */
export const SPEECH_RMS = 0.02
/** Moments above SPEECH_RMS needed to call it speech: about a quarter of a second at one check every 50 ms. */
export const SPEECH_MOMENTS = 5

/** Whether a series of volume readings contains speech: enough moments louder than background noise. */
export function containsSpeech(levels: readonly number[]): boolean {
  return levels.filter((rms) => rms >= SPEECH_RMS).length >= SPEECH_MOMENTS
}

/** How often the microphone volume is read while recording. */
export const READING_MS = 50
/** Pause after speech that ends a short answer by itself (dialogue, repetitions). */
export const SHORT_SILENCE_MS = 2000
/** Pause after speech that ends a longer answer (oral part of the tests), which needs thinking. */
export const LONG_SILENCE_MS = 3500

/**
 * Whether the learner has spoken and then stayed quiet for `silenceMs`: the recording can end by
 * itself. Silence before the first word never counts, so thinking before speaking is fine.
 */
export function endOfSpeech(levels: readonly number[], silenceMs: number): boolean {
  const quiet = Math.ceil(silenceMs / READING_MS)
  if (levels.length <= quiet) return false
  for (let i = levels.length - quiet; i < levels.length; i++) {
    if ((levels[i] ?? 0) >= SPEECH_RMS) return false
  }
  return containsSpeech(levels.slice(0, levels.length - quiet))
}

/** Volume (RMS) shown as a full meter: normal speech near the phone reads about 0.05-0.2. */
const FULL_SCALE_RMS = 0.25

/** Share of the volume meter to fill (0-1); the square root makes quiet speech still visible. */
export function meterFill(rms: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, rms) / FULL_SCALE_RMS))
}
