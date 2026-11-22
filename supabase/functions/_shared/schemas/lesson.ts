import { z } from '../deps.ts'

const question = z.object({
  question_it: z.string(),
  options: z.array(z.string()),
  /** Index of the correct option. */
  answer: z.number().int().min(0).max(3),
})

/**
 * Content of one lesson (about 6-8 minutes): grammar, new words, phrases, idioms,
 * verbs, listening and reading comprehension, and a short dialogue with the tutor.
 * Sizes are set in the prompt; validation only rejects unusable output.
 */
export const lessonContentSchema = z.object({
  intro_it: z.string(),
  grammar: z.object({
    explanation_it: z.string(),
    examples: z.array(z.object({ en: z.string(), it: z.string() })).min(1),
  }),
  words: z.array(z.object({ en: z.string(), it: z.string(), example_en: z.string() })).min(3),
  phrases: z.array(z.object({ en: z.string(), it: z.string() })).min(1),
  idioms: z.array(z.object({ en: z.string(), it: z.string(), meaning_it: z.string() })),
  verbs: z.array(z.object({ base: z.string(), past: z.string(), past_participle: z.string(), it: z.string() })),
  listening: z.object({ text_en: z.string(), questions: z.array(question).min(1) }),
  reading: z.object({ title_en: z.string(), text_en: z.string(), questions: z.array(question).min(1) }),
  dialogue: z.object({ scenario_it: z.string(), opening_en: z.string() }),
})
export type LessonContent = z.infer<typeof lessonContentSchema>

/** Options must be 4 and the answer must point to one of them. */
export function questionsAreValid(content: LessonContent): boolean {
  return [...content.listening.questions, ...content.reading.questions].every(
    (q) => q.options.length === 4 && q.answer < q.options.length,
  )
}

export const lessonRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get'), lesson_id: z.number().int().positive() }),
  /** Generates every missing lesson of a chapter in the background. */
  z.object({ action: z.literal('prefetch'), chapter_id: z.number().int().positive() }),
])
