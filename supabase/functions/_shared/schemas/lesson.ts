import { z } from '../deps.ts'

const question = z.object({
  question: z.string(),
  options: z.array(z.string()),
  /** Index of the correct option. */
  answer: z.number().int().min(0).max(3),
})

/** A sentence or expression in the studied language with its translation in the native one. */
const translated = z.object({ text: z.string(), translation: z.string() })

/**
 * Content of one lesson (about 6-8 minutes): grammar, new words, phrases, idioms,
 * verbs, listening and reading comprehension, and a short dialogue with the tutor.
 * Text in the studied language: `text`, `term`, `example`, `forms`, `title`, `opening`; text in the native language:
 * `translation`, `literal`, `meaning`, `intro`, `explanation`, `question`, `scenario`.
 * Sizes are set in the prompt; validation only rejects unusable output.
 */
export const lessonContentSchema = z.object({
  intro: z.string(),
  grammar: z.object({
    explanation: z.string(),
    examples: z.array(translated).min(1),
  }),
  words: z.array(z.object({ term: z.string(), translation: z.string(), example: z.string() })).min(3),
  phrases: z.array(translated).min(1),
  idioms: z.array(z.object({ text: z.string(), literal: z.string(), meaning: z.string() })),
  /** The forms learners memorise, dictionary form first (English: base, past simple, past participle). */
  verbs: z.array(z.object({ forms: z.array(z.string()).min(1).max(4), translation: z.string() })),
  listening: z.object({ text: z.string(), questions: z.array(question).min(1) }),
  reading: z.object({ title: z.string(), text: z.string(), questions: z.array(question).min(1) }),
  dialogue: z.object({ scenario: z.string(), opening: z.string() }),
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
