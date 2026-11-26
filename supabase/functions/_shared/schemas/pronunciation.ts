import { z } from '../deps.ts'

export const pronunciationSchema = z.object({
  score: z.number().int().min(0).max(100),
  words: z.array(
    z.object({ word: z.string().min(1), tip: z.string().min(1) }),
  ).max(3),
  feedback: z.string().min(1),
})
export type Pronunciation = z.infer<typeof pronunciationSchema>

/** What the model returns when asked for a transcript and a pronunciation assessment together. */
export const assessedTranscriptSchema = z.object({
  transcript: z.string(),
  pronunciation: pronunciationSchema.nullable(),
})
export type AssessedTranscript = z.infer<typeof assessedTranscriptSchema>
