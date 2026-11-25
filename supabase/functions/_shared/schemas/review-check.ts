import { z } from '../deps.ts'
import { languageSchema } from '../languages.ts'

const text = z.string().trim().min(1).max(300)

export const reviewCheckRequestSchema = z.object({
  /** "translation": English word -> Italian; "correction": wrong English sentence -> corrected sentence. */
  kind: z.enum(['translation', 'correction']),
  /** What the card showed (the English word, or the sentence with the mistake). */
  prompt: text,
  /** The stored solution. */
  expected: text,
  /** The learner's answer, typed or transcribed. */
  answer: text,
  /** The answer was spoken: spelling and punctuation do not count. */
  spoken: z.boolean().default(false),
  /** Language of the card; the learner's active language when missing (older clients). */
  language: languageSchema.optional(),
})
export type ReviewCheckRequest = z.infer<typeof reviewCheckRequestSchema>

export const reviewCheckResultSchema = z.object({
  correct: z.boolean(),
  feedback_it: z.string().min(1).max(400),
})
export type ReviewCheckResult = z.infer<typeof reviewCheckResultSchema>
