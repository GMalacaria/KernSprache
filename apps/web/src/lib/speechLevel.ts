/** Volume (RMS of the waveform, 0-1) above which a moment counts as someone speaking, not room noise. */
export const SPEECH_RMS = 0.02
/** Moments above SPEECH_RMS needed to call it speech: about a quarter of a second at one check every 50 ms. */
export const SPEECH_MOMENTS = 5

/** Whether a series of volume readings contains speech: enough moments louder than background noise. */
export function containsSpeech(levels: readonly number[]): boolean {
  return levels.filter((rms) => rms >= SPEECH_RMS).length >= SPEECH_MOMENTS
}
