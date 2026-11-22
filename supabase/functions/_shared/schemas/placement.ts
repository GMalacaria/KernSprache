import { z } from '../deps.ts'
import { CEFR_LEVELS } from '../placement/questions.ts'

export const placementRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({
    action: z.literal('submit'),
    /** question id -> chosen option index; unanswered questions are simply missing */
    answers: z.record(z.string().max(64), z.number().int().min(0).max(3)),
    /** transcripts of the spoken answers; empty when the oral part was skipped */
    oral: z.array(z.object({ id: z.string().max(64), transcript: z.string().max(3000) })).max(4),
  }),
])

export const oralAssessmentSchema = z.object({
  level: z.enum(CEFR_LEVELS),
  feedback_it: z.string(),
  strengths_it: z.array(z.string()),
  to_improve_it: z.array(z.string()),
})
export type OralAssessment = z.infer<typeof oralAssessmentSchema>
