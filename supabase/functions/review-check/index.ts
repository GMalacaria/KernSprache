// review-check: second opinion on a review answer that differs from the stored solution
// (a synonym in a translation, another valid way to correct a sentence). Cheap model, JSON output.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError, getAiProvider } from '../_shared/ai/index.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { loadLearner, pairNames } from '../_shared/languages.ts'
import {
  REVIEW_CHECK_PROMPT_VERSION,
  reviewCheckMessage,
  reviewCheckPrompt,
} from '../_shared/prompts/review-check.v3.ts'
import { reviewCheckRequestSchema, reviewCheckResultSchema } from '../_shared/schemas/review-check.ts'
import { requireApprovedUser, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'review-check'

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireApprovedUser(db)

    const body = reviewCheckRequestSchema.safeParse(
      await req.json().catch(() => null),
    )
    if (!body.success) {
      throw new HttpError(400, 'bad_request', 'Risposta non valida')
    }

    const { pair } = await loadLearner(db, userId, body.data.language)

    let result
    try {
      result = await getAiProvider().generateStructured({
        task: 'correction',
        system: reviewCheckPrompt(pairNames(pair)),
        context: `# Card and answer\n${reviewCheckMessage(body.data)}`,
        messages: [{ role: 'user', content: 'Check the learner answer.' }],
        schema: reviewCheckResultSchema,
        maxTokens: 512,
      })
    } catch (err) {
      if (err instanceof AiError) {
        if (err.usage && err.model) {
          await logAiUsage({
            userId,
            functionName: FUNCTION_NAME,
            promptVersion: REVIEW_CHECK_PROMPT_VERSION,
            model: err.model,
            usage: err.usage,
          })
        }
        throw new HttpError(
          502,
          `ai_${err.code}`,
          'Non riesco a controllare la risposta adesso. Riprova tra poco.',
        )
      }
      throw err
    }

    await logAiUsage({
      userId,
      functionName: FUNCTION_NAME,
      promptVersion: REVIEW_CHECK_PROMPT_VERSION,
      model: result.model,
      usage: result.usage,
    })
    return json(result.data)
  }),
)
