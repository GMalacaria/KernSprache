import { z } from '../deps.ts'
import { languageSchema } from '../languages.ts'

/** Formats produced by MediaRecorder on Android/desktop (webm, ogg) and iOS Safari (mp4). */
export const AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
] as const

/** ~2 MB of audio: over a minute of speech in any of the formats above. */
export const MAX_AUDIO_BASE64_CHARS = 2_800_000

export const transcribeRequestSchema = z.object({
  audio_base64: z.string().min(1).max(MAX_AUDIO_BASE64_CHARS).regex(
    /^[A-Za-z0-9+/]+=*$/,
  ),
  // Browsers report e.g. "audio/webm;codecs=opus": keep only the base type.
  /** Also return a pronunciation assessment (oral dialogue). */
  assess: z.boolean().default(false),
  /** With `assess`: the sentence the learner was reading aloud, so the pronunciation is judged against it. */
  expected_text: z.string().trim().min(1).max(300).optional(),
  /** With `assess`: store the mispronounced words as review cards (dialogue and exercises, never the review itself). */
  save_mistakes: z.boolean().default(false),
  /** Language being spoken; the learner's active language when missing (older clients). */
  language: languageSchema.optional(),
  /** Where the recording comes from, for the saved pronunciation result; guessed for older clients. */
  source: z.enum(['dialogue', 'repeat', 'review', 'test']).optional(),
  mime_type: z.string().transform((m) => m.split(';')[0]!.trim().toLowerCase())
    .pipe(z.enum(AUDIO_MIME_TYPES)),
})

/** Older clients do not send the source: a sentence to read is an exercise (or the review), free speech the dialogue. */
export function guessSource(
  request: { expected_text?: string; save_mistakes: boolean },
): 'dialogue' | 'repeat' | 'review' {
  if (!request.expected_text) return 'dialogue'
  return request.save_mistakes ? 'repeat' : 'review'
}
