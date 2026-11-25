import { z } from '../deps.ts'
import { languageSchema } from '../languages.ts'

export const MAX_SPEAK_CHARS = 600

export const speakRequestSchema = z.object({
  text: z.string().transform((t) => t.trim().replace(/\s+/g, ' ')).pipe(
    z.string().min(1).max(MAX_SPEAK_CHARS),
  ),
  /** Language of the text; the learner's active language when missing (older clients). */
  language: languageSchema.optional(),
})
