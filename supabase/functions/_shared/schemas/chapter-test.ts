import { z } from '../deps.ts'

export const WRITTEN_QUESTION_COUNT = 8
export const ORAL_TASK_COUNT = 2

/** What the model writes: ids are assigned by the server. */
export const generatedTestSchema = z.object({
  questions: z.array(z.object({
    prompt: z.string(),
    options: z.array(z.string()),
    /** Index of the correct option. */
    answer: z.number().int().min(0).max(3),
    /** The full correct sentence, shown with its translation after the test. */
    sentence_en: z.string(),
    translation_it: z.string(),
  })),
  oral_tasks: z.array(z.object({ prompt_it: z.string() })),
})
export type GeneratedTest = z.infer<typeof generatedTestSchema>

/** Exact sizes and a valid answer index for every question. */
export function testIsValid(test: GeneratedTest): boolean {
  return test.questions.length === WRITTEN_QUESTION_COUNT &&
    test.oral_tasks.length === ORAL_TASK_COUNT &&
    test.questions.every((q) => q.options.length === 4 && q.answer < 4 && q.prompt.trim() !== '')
}

/** A question as stored on the server (with the answer). Tests saved before
 * chapter-test.v2 have no sentence and translation. */
export const storedQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()),
  answer: z.number().int().min(0).max(3),
  sentence_en: z.string().optional(),
  translation_it: z.string().optional(),
})
export type StoredQuestion = z.infer<typeof storedQuestionSchema>

/** What the learner sees about a question after submitting (nothing when the test predates v2). */
export function questionReview(
  q: StoredQuestion,
): { id: string; sentence_en: string | null; translation_it: string | null } {
  const sentence = q.sentence_en?.trim()
  const translation = q.translation_it?.trim()
  return { id: q.id, sentence_en: sentence || null, translation_it: (sentence && translation) || null }
}

export const oralTaskSchema = z.object({ id: z.string(), prompt_it: z.string() })
export type OralTask = z.infer<typeof oralTaskSchema>

export const oralAssessmentSchema = z.object({
  scores: z.array(z.object({ id: z.string(), score: z.number().min(0).max(100) })),
  feedback_it: z.string(),
  strengths_it: z.array(z.string()),
  to_improve_it: z.array(z.string()),
})
export type OralAssessment = z.infer<typeof oralAssessmentSchema>

export const chapterTestRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), chapter_id: z.number().int().positive() }),
  z.object({
    action: z.literal('submit'),
    test_id: z.string().uuid(),
    /** question id -> chosen option index; unanswered questions are simply missing */
    answers: z.record(z.string().max(64), z.number().int().min(0).max(3)),
    /** transcripts (or typed answers) of the oral tasks; empty when skipped */
    oral: z.array(z.object({ id: z.string().max(64), transcript: z.string().max(3000) })).max(ORAL_TASK_COUNT),
  }),
])
