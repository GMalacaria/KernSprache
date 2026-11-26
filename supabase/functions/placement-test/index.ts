// placement-test: initial level test, half written (fixed multiple-choice bank,
// graded here) and half oral (transcribed answers assessed by the model).
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError, getAiProvider } from '../_shared/ai/index.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { ORAL_PROMPTS, WRITTEN_QUESTIONS } from '../_shared/placement/questions.ts'
import { combineLevels, scoreWritten } from '../_shared/placement/scoring.ts'
import { PLACEMENT_ORAL_PROMPT_VERSION, placementOralPrompt } from '../_shared/prompts/placement-oral.v3.ts'
import { type Learner, loadLearner, pairNames } from '../_shared/languages.ts'
import { type OralAssessment, oralAssessmentSchema, placementRequestSchema } from '../_shared/schemas/placement.ts'
import { adminClient, requireApprovedUser, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'placement-test'

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireApprovedUser(db)

    const body = placementRequestSchema.safeParse(
      await req.json().catch(() => null),
    )
    if (!body.success) {
      throw new HttpError(400, 'bad_request', 'Richiesta non valida')
    }

    if (body.data.action === 'start') {
      // Questions without answers.
      return json({
        questions: WRITTEN_QUESTIONS.map(({ id, level, prompt, options }) => ({
          id,
          level,
          prompt,
          options,
        })),
        oral_prompts: ORAL_PROMPTS,
      })
    }

    const written = scoreWritten(body.data.answers)
    const transcripts = body.data.oral
      .filter((o) => ORAL_PROMPTS.some((p) => p.id === o.id))
      .map((o) => ({ id: o.id, transcript: o.transcript.trim() }))
    const spoken = transcripts.some((t) => t.transcript.length > 0)
    // The questions are English for now (one set per language in PR 7): the test places the active language.
    const learner = await loadLearner(db, userId)
    const oral = spoken ? await assessOral(userId, learner, transcripts) : null
    const finalLevel = combineLevels(written.level, oral?.level ?? null)

    const { error: insertError } = await adminClient().from('placement_results')
      .insert({
        user_id: userId,
        written_answers: body.data.answers,
        written_correct: written.correct,
        written_total: written.total,
        written_level: written.level,
        oral_transcripts: transcripts,
        oral_level: oral?.level ?? null,
        oral_feedback: oral
          ? {
            feedback: oral.feedback,
            strengths: oral.strengths,
            to_improve: oral.to_improve,
          }
          : null,
        final_level: finalLevel,
        language: learner.pair.target,
      })
    if (insertError) throw insertError

    const { error: profileError } = await db
      .from('profiles')
      .update({ level: finalLevel, onboarded_at: new Date().toISOString() })
      .eq('id', userId)
    if (profileError) throw profileError

    return json({
      written: {
        correct: written.correct,
        total: written.total,
        level: written.level,
        by_level: written.byLevel,
      },
      oral,
      final_level: finalLevel,
    })
  }),
)

async function assessOral(
  userId: string,
  learner: Learner,
  transcripts: { id: string; transcript: string }[],
): Promise<OralAssessment> {
  const tasks = ORAL_PROMPTS.map((p) => `- ${p.id} (${p.level}): ${p.prompt}`).join('\n')
  const answers = ORAL_PROMPTS.map((p) => {
    const t = transcripts.find((x) => x.id === p.id)?.transcript
    return `## ${p.id} (${p.level})\n${t ? t : '(no answer)'}`
  }).join('\n\n')

  try {
    const result = await getAiProvider().generateStructured({
      task: 'explanation',
      system: placementOralPrompt(pairNames(learner.pair)),
      context: `# Tasks (instructions given to the learner in their native language)\n${tasks}`,
      messages: [{
        role: 'user',
        content: `# Learner's spoken answers (transcribed)\n\n${answers}`,
      }],
      schema: oralAssessmentSchema,
      maxTokens: 2048,
    })
    await logAiUsage({
      userId,
      functionName: FUNCTION_NAME,
      promptVersion: PLACEMENT_ORAL_PROMPT_VERSION,
      model: result.model,
      usage: result.usage,
    })
    return result.data
  } catch (err) {
    if (err instanceof AiError) {
      if (err.usage && err.model) {
        await logAiUsage({
          userId,
          functionName: FUNCTION_NAME,
          promptVersion: PLACEMENT_ORAL_PROMPT_VERSION,
          model: err.model,
          usage: err.usage,
        })
      }
      throw new HttpError(
        502,
        `ai_${err.code}`,
        'Non riesco a valutare la parte orale adesso. Riprova tra poco.',
      )
    }
    throw err
  }
}
