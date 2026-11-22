import { z } from '../deps.ts'

export const MISTAKE_CATEGORIES = [
  'verb_tense',
  'article',
  'preposition',
  'word_order',
  'vocabulary',
  'spelling',
  'other',
] as const

/** What the model must return (see CLAUDE.md, "Formato delle correzioni"). */
export const tutorReplySchema = z.object({
  reply: z.string(),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation_it: z.string(),
      category: z.enum(MISTAKE_CATEGORIES),
    }),
  ),
  new_vocab: z.array(z.object({ en: z.string(), it: z.string() })),
})
export type TutorReply = z.infer<typeof tutorReplySchema>

export const MAX_MESSAGE_CHARS = 2000
export const MAX_HISTORY_MESSAGES = 30

/** Request body of the tutor-chat function. */
export const tutorChatRequestSchema = z.object({
  session_id: z.uuid().optional(),
  /** Lesson whose dialogue step this conversation belongs to. */
  lesson_id: z.number().int().positive().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .refine((m) => m.at(-1)?.role === 'user', { message: 'The last message must come from the user' }),
})
export type TutorChatRequest = z.infer<typeof tutorChatRequestSchema>
